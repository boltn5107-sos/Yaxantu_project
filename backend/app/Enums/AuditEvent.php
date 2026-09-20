<?php

namespace App\Enums;

/**
 * Événements réellement significatifs pour l'audit.
 * Toute action sensible (financière, sécurité, statuts, rôles) doit
 * produire une entrée audit_logs via App\Services\AuditService.
 */
enum AuditEvent: string
{
    case LoggedIn = 'auth.login';
    case LoggedOut = 'auth.logout';
    case Registered = 'auth.registered';
    case PasswordReset = 'auth.password_reset';
    case RoleChanged = 'user.role_changed';
    case UserSuspended = 'user.suspended';
    case UserBanned = 'user.banned';
    case SellerCreated = 'seller.created';
    case SellerUpdated = 'seller.updated';
    case SellerVerified = 'seller.verified';
    case SellerSuspended = 'seller.suspended';
    case VerificationSubmitted = 'verification.submitted';
    case VerificationReviewed = 'verification.reviewed';
    case ConfigChanged = 'config.changed';
    case OrderPlaced = 'order.placed';
    case OrderCancelled = 'order.cancelled';
    case OrderUpdated = 'order.updated';
    case PaymentInitiated = 'payment.initiated';
    case PaymentConfirmed = 'payment.confirmed';
    case PaymentFailed = 'payment.failed';
    case RefundRequested = 'refund.requested';
    case RefundProcessed = 'refund.processed';
    case ReviewCreated = 'review.created';
    case FavoriteAdded = 'favorite.added';
    case FavoriteRemoved = 'favorite.removed';

    public function label(): string
    {
        return match ($this) {
            self::LoggedIn => 'Connexion réussie',
            self::LoggedOut => 'Déconnexion',
            self::Registered => 'Inscription',
            self::PasswordReset => 'Réinitialisation du mot de passe',
            self::RoleChanged => 'Changement de rôle',
            self::UserSuspended => 'Compte utilisateur suspendu',
            self::UserBanned => 'Compte utilisateur banni',
            self::SellerCreated => 'Boutique créée',
            self::SellerUpdated => 'Boutique modifiée',
            self::SellerVerified => 'Vendeur vérifié',
            self::SellerSuspended => 'Vendeur suspendu',
            self::VerificationSubmitted => 'Dossier de vérification soumis',
            self::VerificationReviewed => 'Dossier de vérification évalué',
            self::ConfigChanged => 'Règle métier modifiée',
            self::OrderPlaced => 'Commande créée',
            self::OrderCancelled => 'Commande annulée',
            self::OrderUpdated => 'Commande mise à jour',
            self::PaymentInitiated => 'Paiement initié',
            self::PaymentConfirmed => 'Paiement confirmé',
            self::PaymentFailed => 'Paiement échoué',
            self::RefundRequested => 'Remboursement demandé',
            self::RefundProcessed => 'Remboursement traité',
            self::ReviewCreated => 'Avis publié',
            self::FavoriteAdded => 'Produit ajouté aux favoris',
            self::FavoriteRemoved => 'Produit retiré des favoris',
        };
    }
}