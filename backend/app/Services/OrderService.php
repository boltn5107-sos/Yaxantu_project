<?php

namespace App\Services;

use App\Enums\AuditEvent;
use App\Enums\OrderStatus;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Delivery;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Parcours d'achat côté serveur (cahier des charges §14).
 *
 * Une commande est créée uniquement à partir des données du panier, jamais à
 * partir de prix transmis par le client. Le stock est vérifié et décrémenté
 * dans une transaction unique ; un paiement est initié par commande.
 */
class OrderService
{
    public function __construct(
        private readonly CartService $cartService,
        private readonly PaymentManager $payments,
        private readonly ConfigService $config,
        private readonly CommissionService $commissions,
        private readonly DeliveryAssignmentService $assigner,
    ) {}

    /**
     * Convertit le panier en commandes (une par vendeur).
     *
     * @param array<string, mixed> $addressData données d'adresse de livraison
     * @param array<string, mixed> $paymentOptions options (téléphone, etc.)
     */
    public function checkout(User $user, Cart $cart, array $addressData, string $paymentMethod = 'cod', array $paymentOptions = [], bool $shippingApproved = false, ?string $promoCode = null): array
    {
        $this->assertCartNotEmpty($cart);

        $address = $this->createShippingAddress($user, $addressData);
        $promos = app(PromoService::class);

        $orders = [];
        $payments = [];

        DB::transaction(function () use ($user, $cart, $address, $paymentMethod, $paymentOptions, $shippingApproved, $promoCode, $promos, &$orders, &$payments) {
            $grouped = $cart->items->groupBy('seller_id');

            $globalSubtotal = (int) $cart->items->sum('total_minor');
            $promo = null;
            $globalDiscount = 0;

            if (! empty($promoCode)) {
                $error = $promos->errorFor($promoCode, $globalSubtotal);

                if ($error !== null) {
                    throw new RuntimeException($error);
                }

                $promo = $promos->findActive($promoCode);
                $globalDiscount = $promos->discountFor($promoCode, $globalSubtotal);
            }

            foreach ($grouped as $sellerId => $items) {
                $orderSubtotal = (int) $items->sum('total_minor');
                $shareDiscount = $globalDiscount > 0
                    ? (int) floor(($orderSubtotal / $globalSubtotal) * $globalDiscount)
                    : 0;

                $order = $this->createOrder($user, (int) $sellerId, $items, $address, $cart->currency, $shippingApproved, $shareDiscount, $promo?->id);
                $orders[] = $order;

                $this->decrementStock($items);
                $this->recordCommissions($order);

                $payment = $this->payments->initiate($order, $paymentMethod, $paymentOptions);
                $payments[] = $payment;

                AuditService::log(AuditEvent::OrderPlaced, $order, [
                    'items_count' => $items->count(),
                    'total_minor' => $order->total_minor,
                    'discount_minor' => $order->discount_minor,
                ]);
            }

            if ($promo !== null) {
                $promos->markUsed($promo);
            }

            $promos->rewardIfEligible($user);

            $cart->forceFill([
                'status' => 'completed',
                'completed_at' => now(),
            ])->save();
            $cart->items()->delete();
        });

        $this->notifyOrderPlaced($orders);

        foreach ($orders as $order) {
            $order->load(['items', 'payments', 'shippingAddress']);
        }

        return ['orders' => $orders, 'payments' => $payments];
    }

    public function cancel(Order $order, string $reason): Order
    {
        if (in_array($order->status, [OrderStatus::Delivered->value, OrderStatus::Cancelled->value, OrderStatus::Refunded->value], true)) {
            throw new RuntimeException('Cette commande ne peut plus être annulée.');
        }

        DB::transaction(function () use ($order, $reason) {
            foreach ($order->items as $item) {
                Product::query()->whereKey($item->product_id)->increment('stock_quantity', $item->quantity);
            }

            $order->forceFill([
                'status' => OrderStatus::Cancelled->value,
                'payment_status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
            ])->save();
        });

        AuditService::log(AuditEvent::OrderCancelled, $order, ['reason' => $reason]);

        return $order;
    }

    public function createOrder(User $user, int $sellerId, $items, $address, string $currency = 'XOF', bool $shippingApproved = false, int $discountMinor = 0, ?int $promoCodeId = null): Order
    {
        $subtotal = $items->sum(fn ($item) => (int) $item->total_minor);
        $shippingRate = $items->contains(fn ($item) => $item->requires_shipping)
            ? ($subtotal >= 25000 ? 0 : 2000)
            : 0;

        if ($shippingRate > 0 && ! $shippingApproved) {
            throw new RuntimeException(sprintf(
                'Vous devez accepter les frais de livraison de %d FCFA avant de confirmer la commande.',
                $shippingRate,
            ));
        }

        $order = Order::create([
            'user_id' => $user->getKey(),
            'seller_id' => $sellerId,
            'order_number' => $this->generateNumber(),
            'status' => OrderStatus::PaymentPending->value,
            'payment_status' => 'pending',
            'shipping_status' => 'pending',
            'shipping_address_id' => $address?->getKey(),
            'shipping_method' => 'standard',
            'shipping_rate_minor' => $shippingRate,
            'subtotal_minor' => $subtotal,
            'discount_minor' => $discountMinor,
            'total_minor' => max(0, $subtotal - $discountMinor) + $shippingRate,
            'promo_code_id' => $promoCodeId,
            'currency' => $currency,
            'placed_at' => now(),
        ]);

        foreach ($items as $item) {
            $this->createOrderItem($order, $item);
        }

        $this->createDelivery($order, $address);

        return $order;
    }

    private function createOrderItem(Order $order, CartItem $item): OrderItem
    {
        return OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $item->product_id,
            'product_variant_id' => $item->product_variant_id,
            'seller_id' => $item->seller_id,
            'product_snapshot' => $item->product_snapshot,
            'variant_snapshot' => $item->variant_snapshot,
            'quantity' => $item->quantity,
            'unit_price_minor' => $item->unit_price_minor,
            'unit_price_currency' => $item->unit_price_currency,
            'total_minor' => $item->total_minor,
            'requires_shipping' => $item->requires_shipping,
            'weight' => $item->weight,
        ]);
    }

    private function createDelivery(Order $order, $address): Delivery
    {
        return Delivery::create([
            'order_id' => $order->id,
            'status' => 'pending',
            'shipping_address_id' => $address?->getKey(),
            'estimated_delivery' => now()->addDays((int) $this->config->int('order.default_delivery_days', 3)),
            'provider' => 'seller',
        ]);
    }

    private function createShippingAddress(User $user, array $data)
    {
        $addressId = $data['id'] ?? null;

        if ($addressId !== null && $user->addresses()->whereKey($addressId)->exists()) {
            return $user->addresses()->find($addressId);
        }

        $required = ['address_line1', 'city'];

        foreach ($required as $field) {
            if (empty(trim((string) ($data[$field] ?? '')))) {
                throw new RuntimeException('L\'adresse de livraison est incomplète.');
            }
        }

        return $user->addresses()->create([
            'type' => 'shipping',
            'first_name' => $data['first_name'] ?? $user->name,
            'last_name' => $data['last_name'] ?? null,
            'address_line1' => $data['address_line1'],
            'address_line2' => $data['address_line2'] ?? null,
            'city' => $data['city'],
            'state_province' => $data['state_province'] ?? null,
            'postal_code' => $data['postal_code'] ?? null,
            'country_code' => $data['country_code'] ?? 'CM',
            'phone' => $data['phone'] ?? $user->phone,
            'is_default' => ! $user->addresses()->exists(),
        ]);
    }

    private function decrementStock($items): void
    {
        foreach ($items as $item) {
            $product = Product::query()->whereKey($item->product_id)->lockForUpdate()->first();

            if ($product === null || $product->stock_quantity < $item->quantity) {
                throw new RuntimeException(sprintf(
                    'Stock insuffisant pour "%s".',
                    $item->product_snapshot['name'] ?? $item->product_id,
                ));
            }

            $product->decrement('stock_quantity', $item->quantity);
        }
    }

    private function recordCommissions(Order $order): void
    {
        foreach ($order->items as $item) {
            $this->commissions->recordForItem($order, $item);
        }
    }

    private function assertCartNotEmpty(Cart $cart): void
    {
        if ($cart->items->isEmpty()) {
            throw new RuntimeException('Votre panier est vide.');
        }
    }

    private function generateNumber(): string
    {
        return strtoupper('YX-'.date('ymd').'-'.Str::random(6));
    }

    private function notifyOrderPlaced(array $orders): void
    {
        foreach ($orders as $order) {
            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'order.created',
                'title' => 'Commande enregistrée',
                'message' => 'Votre commande '.$order->order_number.' a été créée et attend le paiement.',
                'data' => ['order_number' => $order->order_number],
                'action_url' => '/orders/'.$order->order_number,
                'action_text' => 'Voir la commande',
                'priority' => 'normal',
            ]);
        }
    }

    // ── Cycle de vie côté vendeur / livreur (phase 3) ────────────────────

    /**
     * Le vendeur accepte la commande : elle passe en préparation.
     */
    public function accept(Order $order): Order
    {
        if (! in_array($order->status, [OrderStatus::PaymentPending->value, OrderStatus::Paid->value], true)) {
            throw new RuntimeException('Cette commande ne peut pas être acceptée.');
        }

        $order->forceFill(['status' => OrderStatus::Preparation->value])->save();

        AuditService::log(AuditEvent::OrderUpdated, $order, ['action' => 'accept']);

        return $order->fresh(['items', 'payments', 'delivery']);
    }

    /**
     * Le vendeur refuse la commande (avant paiement) : remise en stock.
     */
    public function refuseBySeller(Order $order, string $reason): Order
    {
        if ($order->payment_status === 'paid') {
            throw new RuntimeException('Cette commande a déjà été payée, elle ne peut pas être refusée.');
        }

        if (in_array($order->status, [OrderStatus::Delivered->value, OrderStatus::Cancelled->value], true)) {
            throw new RuntimeException('Cette commande ne peut pas être refusée.');
        }

        DB::transaction(function () use ($order, $reason) {
            foreach ($order->items as $item) {
                Product::query()->whereKey($item->product_id)->increment('stock_quantity', $item->quantity);
            }

            $order->forceFill([
                'status' => OrderStatus::Cancelled->value,
                'payment_status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $reason,
            ])->save();

            $order->delivery()?->update(['status' => 'failed']);
        });

        AuditService::log(AuditEvent::OrderCancelled, $order, ['reason' => $reason, 'by' => 'seller']);

        return $order;
    }

    /**
     * Le vendeur marque la commande comme expédiée (tracking + attribution
     * d'un livreur de la plateforme si disponible).
     */
    public function ship(Order $order, ?string $tracking = null): Order
    {
        if ($order->status !== OrderStatus::Preparation->value) {
            throw new RuntimeException('La commande doit d\'abord être acceptée.');
        }

        DB::transaction(function () use ($order, $tracking) {
            $order->forceFill([
                'status' => OrderStatus::Shipped->value,
                'shipping_status' => 'shipped',
                'tracking_number' => $tracking ?: 'YT-'.strtoupper(Str::random(10)),
            ])->save();

            $delivery = $order->delivery()?->first();
            $delivery?->forceFill([
                'status' => 'shipped',
                'tracking_number' => $order->tracking_number,
            ])->save();

            $courier = $this->assigner->assign($order);
            if ($courier !== null) {
                Notification::create([
                    'user_id' => $courier->user_id,
                    'type' => 'delivery.assigned',
                    'title' => 'Nouvelle course',
                    'message' => 'Une livraison vous est attribuée (commande '.$order->order_number.').',
                    'data' => ['order_number' => $order->order_number],
                    'action_url' => '/delivery/jobs',
                    'action_text' => 'Voir la course',
                    'priority' => 'high',
                ]);
            }
        });

        Notification::create([
            'user_id' => $order->user_id,
            'type' => 'order.shipped',
            'title' => 'Commande expédiée',
            'message' => 'Votre commande '.$order->order_number.' est expédiée. Suivi : '.$order->tracking_number,
            'data' => ['order_number' => $order->order_number],
            'action_url' => '/orders/'.$order->order_number,
            'action_text' => 'Suivre',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::OrderUpdated, $order, ['action' => 'ship']);

        return $order->fresh(['items', 'payments', 'delivery', 'shippingAddress']);
    }

    /**
     * Confirmation de livraison (vendeur ou livreur) : paiement COD encaissé,
     * séquestre libéré pour le vendeur, score de confiance majoré.
     */
    public function markDelivered(Order $order, ?string $proofPath = null, ?string $notes = null): Order
    {
        if (! in_array($order->status, [OrderStatus::Shipped->value, OrderStatus::InDelivery->value, OrderStatus::Preparation->value], true)) {
            throw new RuntimeException('Cette commande ne peut pas être marquée livrée.');
        }

        DB::transaction(function () use ($order, $proofPath, $notes) {
            // Paiement à la livraison : l'argent est encaissé maintenant.
            if ($order->payment_status !== 'paid') {
                $payment = $order->payments()->where('method', 'cod')->orderByDesc('id')->first();

                if ($payment !== null) {
                    $this->payments->confirm($payment, ['status' => 'success']);
                }
            }

            $order->forceFill([
                'status' => OrderStatus::Delivered->value,
                'shipping_status' => 'delivered',
                'payment_status' => 'paid',
                'completed_at' => now(),
            ])->save();

            $delivery = $order->delivery;
            $delivery?->forceFill([
                'status' => 'delivered',
                'actual_delivery' => now(),
                'delivered_proof_path' => $proofPath ?: $delivery->delivered_proof_path,
                'deliverer_notes' => $notes ?: $delivery->deliverer_notes,
            ])->save();

            $this->payments->releaseEscrowForOrder($order);
        });

        Notification::create([
            'user_id' => $order->user_id,
            'type' => 'order.delivered',
            'title' => 'Commande livrée',
            'message' => 'Votre commande '.$order->order_number.' a été livrée. Merci de confirmer la réception.',
            'data' => ['order_number' => $order->order_number],
            'action_url' => '/orders/'.$order->order_number,
            'action_text' => 'Voir la commande',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::OrderUpdated, $order, ['action' => 'delivered']);

        return $order->fresh(['items', 'payments', 'delivery', 'shippingAddress']);
    }
}