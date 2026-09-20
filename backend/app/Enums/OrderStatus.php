<?php

namespace App\Enums;

/**
 * Statuts d'une commande (cahier des charges §22).
 */
enum OrderStatus: string
{
    case Created = 'created';
    case PaymentPending = 'payment_pending';
    case Paid = 'paid';
    case Preparation = 'preparation';
    case Shipped = 'shipped';
    case InDelivery = 'in_delivery';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Returned = 'returned';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Créée',
            self::PaymentPending => 'Paiement en attente',
            self::Paid => 'Payée',
            self::Preparation => 'En préparation',
            self::Shipped => 'Expédiée',
            self::InDelivery => 'En livraison',
            self::Delivered => 'Livrée',
            self::Cancelled => 'Annulée',
            self::Returned => 'Retournée',
            self::Refunded => 'Remboursée',
        };
    }
}