<?php

namespace App\Services;

use App\Contracts\PaymentProvider;
use App\Enums\AuditEvent;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Commission;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Seller;
use App\Models\SellerTransaction;
use App\Services\Payments\CodProvider;
use App\Services\Payments\MobileMoneyProvider;
use App\Services\Payments\MissingProvider;
use App\Services\Payments\WaveProvider;
use Illuminate\Support\Str;

/**
 * Orchestrateur des paiements.
 *
 * Règles de sécurité (cahier des charges §15, §30) :
 *  - le montant est toujours calculé côté serveur, jamais transmis par le client ;
 *  - une transaction n'est "payée" qu'après confirmation serveur (webhook) ;
 *  - la confirmation est idempotente ;
 *  - chaque transition importante est journalisée.
 */
class PaymentManager
{
    /** @var array<string, PaymentProvider> */
    private array $providers = [];

    public function __construct(
        private readonly ConfigService $config,
    ) {
        $this->providers[$this->methodFor('cod')] = new CodProvider();
        $this->providers[$this->methodFor('mobile_money')] = new MobileMoneyProvider();
        $this->providers[$this->methodFor('wave')] = new WaveProvider();
    }

    /**
     * Méthodes de paiement supportées, en tenant compte des règles actives
     * (ex. le paiement à la livraison peut être masqué par l'administrateur).
     *
     * @return array<int, array{id: string, label: string, description: string}>
     */
    public function methods(): array
    {
        $methods = [
            ['id' => 'cod', 'label' => 'Paiement à la livraison', 'description' => 'Payez en espèces à la réception.'],
            ['id' => 'mobile_money', 'label' => 'Mobile Money', 'description' => 'MTN / Orange Money.'],
            ['id' => 'wave', 'label' => 'Wave', 'description' => 'Payez avec votre compte Wave.'],
        ];

        if (! $this->config->codEnabled()) {
            $methods = array_values(array_filter(
                $methods,
                fn (array $method) => $method['id'] !== 'cod',
            ));
        }

        return $methods;
    }

    /**
     * Initie un paiement pour la commande.
     *
     * @param array<string, mixed> $options données client (téléphone, etc.)
     */
    public function initiate(Order $order, string $method, array $options = []): Payment
    {
        $method = in_array($method, ['cod', 'mobile_money', 'wave'], true) ? $method : 'cod';
        $provider = $this->providers[$this->methodFor($method)] ?? new MissingProvider();

        $transaction = $provider->createTransaction($order, $options);

        $payment = Payment::create([
            'order_id' => $order->id,
            'amount_minor' => $order->total_minor,
            'currency' => $order->currency,
            'method' => $method,
            'status' => PaymentStatus::Pending->value,
            'provider' => $method,
            'provider_payment_id' => $transaction['transaction_id'],
            'transaction_id' => $transaction['transaction_id'],
            'requires_capture' => $transaction['requires_capture'],
            'gateway_response' => $transaction['extra'] ?? null,
        ]);

        AuditService::log(AuditEvent::PaymentInitiated, $payment, [
            'order_number' => $order->order_number,
            'method' => $method,
            'amount_minor' => $order->total_minor,
        ]);

        return $payment;
    }

    /**
     * Confirme un paiement (idempotent). Utilisée par le webhook.
     */
    public function confirm(Payment $payment, array $payload = []): bool
    {
        if ($payment->status === PaymentStatus::Paid->value || $payment->status === PaymentStatus::Captured->value) {
            return true;
        }

        if ($payment->status === PaymentStatus::Failed->value) {
            return false;
        }

        $provider = $this->providers[$this->methodFor($payment->method)] ?? new MissingProvider();

        if (! $provider->confirmTransaction($payment, $payload)) {
            return false;
        }

        $feeMinor = $this->feeFor($payment);
        $payment->forceFill([
            'status' => PaymentStatus::Paid->value,
            'paid_at' => now(),
            'fee_minor' => $feeMinor,
            'net_amount_minor' => max(0, (int) $payment->amount_minor - $feeMinor),
        ])->save();

        $order = $payment->order;
        $order->forceFill([
            'status' => $payment->method === 'cod' ? OrderStatus::Preparation->value : OrderStatus::Paid->value,
            'payment_status' => 'paid',
        ])->save();

        $this->creditSellers($order);

        $this->notifyOrderPaid($order);

        AuditService::log(AuditEvent::PaymentConfirmed, $payment, [
            'order_number' => $order->order_number,
            'transaction_id' => $payment->transaction_id,
        ]);

        return true;
    }

    /**
     * Marque une transaction comme échouée (retour au statut "pending" pour
     * permettre une nouvelle tentative via un nouveau record de paiement).
     */
    public function fail(Payment $payment): bool
    {
        if ($payment->status === PaymentStatus::Paid->value) {
            return false;
        }

        $payment->forceFill(['status' => PaymentStatus::Failed->value])->save();

        AuditService::log(AuditEvent::PaymentFailed, $payment, [
            'order_number' => $payment->order?->order_number,
        ]);

        return true;
    }

    private function creditSellers(Order $order): void
    {
        $amounts = $order->items->groupBy('seller_id');

        foreach ($amounts as $sellerId => $items) {
            $seller = Seller::query()->find($sellerId);

            if ($seller === null) {
                continue;
            }

            $subtotal = $items->sum(fn ($item) => $item->total_minor);
            $balance = $seller->balance()->firstOrCreate(['currency' => $order->currency]);

            // Séquestre : l'argent reste "en attente" jusqu'à confirmation de
            // réception (libéré par releaseEscrowForOrder à la livraison).
            $balance->increment('amount_pending', $subtotal);

            $payment = $order->payments()->first();
            $commission = Commission::query()
                ->where('order_id', $order->id)
                ->sum('amount_minor');
            $fee = (int) ($payment?->fee_minor ?? $this->feeFor($payment));

            SellerTransaction::create([
                'seller_id' => $seller->id,
                'type' => 'sale',
                'direction' => 'in',
                'amount_minor' => $subtotal,
                'currency' => $order->currency,
                'commission_minor' => (int) $commission,
                'fee_minor' => $fee,
                'net_minor' => max(0, $subtotal - $commission - $fee),
                'order_id' => $order->id,
                'description' => 'Vente '.$order->order_number,
            ]);
        }
    }

    /**
     * Libère le séquestre à la livraison : le solde en attente devient
     * disponible pour retrait (phase 3, intégration Wave).
     */
    public function releaseEscrowForOrder(Order $order): void
    {
        $seller = Seller::query()->find($order->seller_id);

        if ($seller === null) {
            return;
        }

        $balance = $seller->balance()->firstOrCreate(['currency' => $order->currency]);
        $pending = $balance->amount_pending;

        if ($pending < 1) {
            return;
        }

        $balance->decrement('amount_pending', $pending);
        $balance->increment('amount_available', $pending);

        Commission::query()
            ->where('order_id', $order->id)
            ->update(['status' => 'paid']);

        SellerTransaction::create([
            'seller_id' => $seller->id,
            'type' => 'release',
            'direction' => 'in',
            'amount_minor' => $pending,
            'currency' => $order->currency,
            'net_minor' => $pending,
            'order_id' => $order->id,
            'description' => 'Séquestre libéré '.$order->order_number,
        ]);
    }

    /**
     * Frais de paiement (configurable, 1 % par défaut pour mobile money/Wave).
     */
    public function feeFor(?Payment $payment): int
    {
        if ($payment === null) {
            return 0;
        }

        if ($payment->method === 'cod') {
            return 0;
        }

        $bps = $this->config->int('payments.fee_bps', 100);

        return (int) round((int) $payment->amount_minor * $bps / 10000);
    }

    private function notifyOrderPaid(Order $order): void
    {
        Notification::create([
            'user_id' => $order->user_id,
            'type' => 'order.paid',
            'title' => 'Paiement confirmé',
            'message' => 'Votre commande '.$order->order_number.' a été payée avec succès.',
            'data' => ['order_number' => $order->order_number],
            'action_url' => '/orders/'.$order->order_number,
            'action_text' => 'Voir la commande',
            'priority' => 'high',
        ]);
    }

    public function methodFor(string $method): string
    {
        return Str::snake($method);
    }
}