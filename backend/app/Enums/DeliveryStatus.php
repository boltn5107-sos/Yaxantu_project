<?php

namespace App\Enums;

/**
 * Statuts de livraison (cahier des charges §23).
 */
enum DeliveryStatus: string
{
    case Pending = 'pending';
    case Ready = 'ready';
    case PickedUp = 'picked_up';
    case InTransit = 'in_transit';
    case OutForDelivery = 'out_for_delivery';
    case Delivered = 'delivered';
    case Failed = 'failed';
    case Returned = 'returned';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Ready => 'Prête',
            self::PickedUp => 'Récupérée',
            self::InTransit => 'En transit',
            self::OutForDelivery => 'En cours de livraison',
            self::Delivered => 'Livrée',
            self::Failed => 'Échec',
            self::Returned => 'Retournée',
        };
    }
}