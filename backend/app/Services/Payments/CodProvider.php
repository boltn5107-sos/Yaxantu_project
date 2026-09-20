<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProvider;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

/**
 * Paiement à la livraison (COD).
 *
 * La transaction n'est jamais créée chez un tiers : le paiement reste
 * "pending" jusqu'à la confirmation de livraison côté serveur.
 */
class CodProvider implements PaymentProvider
{
    public function createTransaction(Order $order, array $options = []): array
    {
        return [
            'transaction_id' => 'COD-'.Str::upper((string) Str::random(12)),
            'requires_capture' => false,
            'redirect_url' => null,
            'extra' => ['method' => 'cod'],
        ];
    }

    public function confirmTransaction(Payment $payment, array $payload = []): bool
    {
        $order = $payment->order;

        if ($order === null) {
            return false;
        }

        // Livraison effectuée (on confirme à la remise) ou webhook simulé.
        return $order->shipping_status === 'delivered'
            || ($payload['status'] ?? 'success') === 'success';
    }
}