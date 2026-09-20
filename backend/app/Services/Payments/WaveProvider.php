<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProvider;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

/**
 * Wave (mobile money) — simulateur local, même principe que MobileMoneyProvider.
 *
 * En production, ce driver appellerait l'API Wave (initiation paiement,
 * webhook signé HMAC). Ici la confirmation passe par la route de callback.
 * Note : la commission et les frais sont prélevés côté plateforme au moment
 * du versement ; le montant "en attente" de l'acheteur est le séquestre.
 */
class WaveProvider implements PaymentProvider
{
    public function createTransaction(Order $order, array $options = []): array
    {
        return [
            'transaction_id' => 'WAVE-'.Str::upper((string) Str::random(16)),
            'requires_capture' => false,
            'redirect_url' => null,
            'extra' => [
                'phone' => $options['phone'] ?? null,
                'provider' => 'wave',
            ],
        ];
    }

    public function confirmTransaction(Payment $payment, array $payload = []): bool
    {
        return ($payload['status'] ?? 'success') === 'success';
    }
}