<?php

namespace App\Enums;

/**
 * Rôles applicatifs Taaba-taaba.
 * Un utilisateur peut cumuler plusieurs rôles (ex. buyer + seller).
 */
enum Role: string
{
    case Admin = 'admin';
    case Moderator = 'moderator';
    case Seller = 'seller';
    case Buyer = 'buyer';
    case Delivery = 'delivery';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrateur',
            self::Moderator => 'Modérateur',
            self::Seller => 'Vendeur',
            self::Buyer => 'Acheteur',
            self::Delivery => 'Livreur',
        };
    }

    /** Rôles à assigner automatiquement à l'inscription. */
    public static function defaults(): array
    {
        return [self::Buyer];
    }
}