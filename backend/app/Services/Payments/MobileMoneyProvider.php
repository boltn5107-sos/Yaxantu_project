<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProvider;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

/**
 * Mobile Money (MTN / Orange Money) — simulateur local.
 *
 * En production, ce driver serait remplacé par l'intégration réelle du
 * fournisseur (Token, session paiement, webhook). Ici, la confirmation est
 * explicitement déclenchée via une route de callback qui représente le
 * webhook du fournisseur.
 */
class MobileMoneyProvider implements PaymentProvider
{
    public function createTransaction(Order $order, array $options = []): array
    {
        return [
            'transaction_id' => 'MOMO-'.Str::upper((string) Str::random(16)),
            'requires_capture' => false,
            'redirect_url' => null,
            'extra' => [
                'phone' => $options['phone'] ?? null,
                'provider' => $options['provider'] ?? 'momo',
            ],
        ];
    }

    public function confirmTransaction(Payment $payment, array $payload = []): bool
    {
        // Un webhook réel fournirait ici le statut externe. La simulation
        // accepte toute confirmation explicite.
        return ($payload['status'] ?? 'success') === 'success';
    }
}