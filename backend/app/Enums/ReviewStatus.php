<?php

namespace App\Enums;

/**
 * Statuts d'un avis (cahier des charges §20, §21).
 */
enum ReviewStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Hidden = 'hidden';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Approved => 'Approuvé',
            self::Hidden => 'Masqué',
            self::Rejected => 'Rejeté',
        };
    }
}