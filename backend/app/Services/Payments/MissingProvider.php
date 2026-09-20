<?php

namespace App\Services\Payments;

use App\Contracts\PaymentProvider;
use App\Models\Order;
use App\Models\Payment;
use RuntimeException;

/**
 * Fournisseur de repli : aucune méthode de paiement inconnue ne doit
 * permettre la création d'une transaction.
 */
class MissingProvider implements PaymentProvider
{
    public function createTransaction(Order $order, array $options = []): array
    {
        throw new RuntimeException('Méthode de paiement non supportée.');
    }

    public function confirmTransaction(Payment $payment, array $payload = []): bool
    {
        return false;
    }
}