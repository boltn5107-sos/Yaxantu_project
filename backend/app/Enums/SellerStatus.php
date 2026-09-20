<?php

namespace App\Enums;

enum SellerStatus: string
{
    case Draft = 'draft';
    case PendingVerification = 'pending_verification';
    case Active = 'active';
    case Suspended = 'suspended';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Brouillon',
            self::PendingVerification => 'En attente de vérification',
            self::Active => 'Actif',
            self::Suspended => 'Suspendu',
            self::Closed => 'Fermé',
        };
    }
}