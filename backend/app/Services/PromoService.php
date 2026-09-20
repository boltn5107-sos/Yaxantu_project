<?php

namespace App\Services;

use App\Models\PromoCode;
use App\Models\Referral;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Logique métier des codes promo et du programme de parrainage.
 */
class PromoService
{
    /**
     * Cherche un code actif (sans validation de règles facultatives).
     */
    public function findActive(string $code): ?PromoCode
    {
        return PromoCode::query()
            ->where('code', strtoupper(trim($code)))
            ->where('is_active', true)
            ->first();
    }

    /**
     * Message d'erreur si le code ne peut pas être appliqué, sinon null.
     */
    public function errorFor(string $code, ?int $subtotalMinor = null): ?string
    {
        $promo = $this->findActive($code);

        if ($promo === null) {
            return 'Ce code promo est invalide.';
        }

        return $promo->errorFor($subtotalMinor);
    }

    /**
     * Réduction totale (minor) pour un sous-total donné.
     */
    public function discountFor(string $code, int $subtotalMinor): int
    {
        $promo = $this->findActive($code);

        return $promo?->discountFor($subtotalMinor) ?? 0;
    }

    public function markUsed(PromoCode $promo): void
    {
        $promo->increment('used_count');
    }

    /**
     * Crée un coupon de récompense (montant fixe unique) pour le parrain.
     */
    public function createReferralReward(User $sponsor): PromoCode
    {
        return PromoCode::create([
            'code' => 'PARRAIN-'.strtoupper(Str::random(6)),
            'description' => 'Récompense parrainage — a offert à '.$sponsor->email,
            'discount_type' => 'fixed',
            'discount_value' => 1000,
            'one_time' => true,
            'is_active' => true,
            'expires_at' => now()->addDays(90),
        ]);
    }

    /**
     * Récompense le parrain quand son filleul passe sa première commande.
     */
    public function rewardIfEligible(User $user): void
    {
        if (! $user->sponsor_id) {
            return;
        }

        $alreadyRewarded = Referral::query()
            ->where('referred_user_id', $user->getKey())
            ->where('status', 'rewarded')
            ->exists();

        if ($alreadyRewarded) {
            return;
        }

        $referral = Referral::query()
            ->where('referred_user_id', $user->getKey())
            ->latest('id')
            ->first();

        if ($referral === null) {
            return;
        }

        $reward = $this->createReferralReward($referral->referrer);

        $referral->forceFill([
            'status' => 'rewarded',
            'promo_code_id' => $reward->id,
        ])->save();
    }

    /**
     * Enregistre une invitation lors d'une inscription avec code de parrainage.
     */
    public function registerReferral(User $newUser, string $sponsorCode): ?Referral
    {
        $sponsor = User::query()
            ->where('referral_code', strtoupper(trim($sponsorCode)))
            ->whereKeyNot($newUser->getKey())
            ->first();

        if ($sponsor === null) {
            return null;
        }

        $newUser->forceFill(['sponsor_id' => $sponsor->id])->save();

        return Referral::create([
            'referrer_id' => $sponsor->id,
            'referred_user_id' => $newUser->getKey(),
            'status' => 'pending',
        ]);
    }

    /**
     * Génère le code personnel d'un utilisateur (créé à la volée si besoin).
     */
    public function ensureCode(User $user): string
    {
        if (! empty($user->referral_code)) {
            return $user->referral_code;
        }

        $code = null;

        do {
            $code = strtoupper('YX-'.Str::random(5));
        } while (User::query()->where('referral_code', $code)->exists());

        $user->forceFill(['referral_code' => $code])->save();

        return $code;
    }
}