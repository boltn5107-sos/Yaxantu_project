<?php

namespace App\Enums;

/**
 * Statuts d'un paiement.
 *
 * Règle de sécurité (cahier des charges §15) : une transaction ne doit
 * jamais être considérée comme payée à partir d'une réponse du navigateur ;
 * seuls le webhook fournisseur ou un rapprochement serveur peuvent la
 * confirmer.
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case Authorized = 'authorized';
    case Captured = 'captured';
    case Paid = 'paid';
    case Failed = 'failed';
    case Refunded = 'refunded';
    case Unauthorized = 'unauthorized';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Authorized => 'Autorisé',
            self::Captured => 'Capturé',
            self::Paid => 'Payé',
            self::Failed => 'Échoué',
            self::Refunded => 'Remboursé',
            self::Unauthorized => 'Non autorisé',
        };
    }
}