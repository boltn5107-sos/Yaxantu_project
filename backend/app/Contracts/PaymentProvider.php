<?php

namespace App\Contracts;

use App\Models\Order;
use App\Models\Payment;

/**
 * Abstraction des fournisseurs de paiement (cahier des charges §15).
 *
 * La confirmation d'un paiement doit toujours provenir d'une source serveur
 * fiable (webhook fournisseur ou rapprochement), jamais du navigateur.
 */
interface PaymentProvider
{
    /**
     * Crée une transaction auprès du fournisseur pour la commande.
     *
     * @param array<string, mixed> $options données propres au fournisseur
     * @return array{transaction_id: string, requires_capture: bool, redirect_url?: string|null, extra?: array<string, mixed>}
     */
    public function createTransaction(Order $order, array $options = []): array;

    /**
     * Confirme la transaction (idempotent). Retourne false si le paiement
     * ne peut pas être confirmé.
     *
     * @param array<string, mixed> $payload donnée du webhook/reconnaissance
     */
    public function confirmTransaction(Payment $payment, array $payload = []): bool;
}