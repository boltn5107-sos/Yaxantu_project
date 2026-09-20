<?php

namespace App\Services;

use App\Enums\AuditEvent;
use App\Models\Notification;
use App\Models\Seller;
use App\Models\SellerBalance;
use App\Models\SellerPayout;
use App\Models\SellerTransaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Versements au vendeur (phase 3) : retrait manuel à la demande et prochain
 * versement automatique programmé. Le modèle est 100 % à la performance :
 * aucun frais tant qu'aucune vente n'a été conclue.
 */
class PayoutService
{
    public function __construct(
        private readonly ConfigService $config,
    ) {}

    /**
     * Demande de retrait manuel (Wave / Orange Money / compte bancaire).
     *
     * @throws RuntimeException si le montant dépasse le solde disponible
     */
    public function request(Seller $seller, int $amountMinor, string $method): SellerPayout
    {
        $balance = $seller->balance()->firstOrCreate(['currency' => $seller->currency]);

        $minimum = $this->config->payoutMinimum();
        $maximum = $this->config->int('payout.max_amount_minor', 0);

        if ($amountMinor < $minimum) {
            throw new RuntimeException('Le montant minimal de retrait est de '.number_format($minimum).' '.$seller->currency.'.');
        }

        if ($maximum > 0 && $amountMinor > $maximum) {
            throw new RuntimeException('Ce montant dépasse le retrait maximal autorisé.');
        }

        if ($balance->amount_available < $amountMinor) {
            throw new RuntimeException('Solde disponible insuffisant.');
        }

        $payout = null;

        DB::transaction(function () use ($seller, $balance, $amountMinor, $method, &$payout) {
            $balance->decrement('amount_available', $amountMinor);

            $payout = SellerPayout::create([
                'seller_id' => $seller->id,
                'balance_id' => $balance->id,
                'amount_minor' => $amountMinor,
                'currency' => $seller->currency,
                'method' => $method,
                'status' => 'requested',
                'requested_at' => now(),
            ]);

            SellerTransaction::create([
                'seller_id' => $seller->id,
                'type' => 'payout',
                'direction' => 'out',
                'amount_minor' => $amountMinor,
                'currency' => $seller->currency,
                'commission_minor' => 0,
                'fee_minor' => $this->config->int('payout.fee_bps', 0) > 0
                    ? (int) round($amountMinor * $this->config->int('payout.fee_bps', 0) / 10000)
                    : 0,
                'net_minor' => $amountMinor,
                'payout_id' => $payout->id,
                'description' => 'Retrait '.$method.' demandé',
            ]);
        });

        Notification::create([
            'user_id' => $seller->user_id,
            'type' => 'payout.requested',
            'title' => 'Retrait demandé',
            'message' => 'Votre retrait de '.number_format($amountMinor).' '.$seller->currency.' a été enregistré.',
            'action_url' => '/seller/finances',
            'action_text' => 'Voir mes versements',
            'priority' => 'normal',
        ]);

        AuditService::log(AuditEvent::PaymentInitiated, $payout, ['amount_minor' => $amountMinor, 'method' => $method]);

        return $payout;
    }

    /**
     * Prochain versement automatique : le solde en attente est versé selon le
     * rythme de la plateforme (chaque jour à défaut).
     *
     * @return array{date: string, amount_minor: int}
     */
    public function nextScheduled(Seller $seller): array
    {
        $balance = SellerBalance::query()->where('seller_id', $seller->id)->first();

        $days = max(1, $this->config->int('payout.auto_schedule_days', 1));

        return [
            'date' => now()->addDays($days)->startOfDay()->toIso8601String(),
            'amount_minor' => (int) ($balance?->amount_pending ?? 0),
        ];
    }
}