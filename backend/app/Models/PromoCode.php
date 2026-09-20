<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PromoCode extends Model
{
    protected $fillable = [
        'code',
        'affiliate_id',
        'description',
        'discount_type',
        'discount_value',
        'min_order_minor',
        'max_uses',
        'used_count',
        'one_time',
        'is_active',
        'starts_at',
        'expires_at',
        'max_discount_per_order_minor',
        'per_user_limit',
        'max_discount_total_minor',
    ];

    protected function casts(): array
    {
        return [
            'affiliate_id' => 'integer',
            'min_order_minor' => 'integer',
            'max_uses' => 'integer',
            'used_count' => 'integer',
            'one_time' => 'boolean',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'max_discount_per_order_minor' => 'integer',
            'per_user_limit' => 'integer',
            'max_discount_total_minor' => 'integer',
        ];
    }

    public function isFixed(): bool
    {
        return $this->discount_type === 'fixed';
    }

    /**
     * Réduction théorique sur un sous-total (minor, FCFA).
     */
    public function discountFor(int $subtotalMinor): int
    {
        if (! $this->isFixed()) {
            return (int) round($subtotalMinor * ($this->discount_value / 100));
        }

        return min((int) $this->discount_value, $subtotalMinor);
    }

    /**
     * Réduction effectivement accordée, bornée par le plafond par commande.
     */
    public function discountCappedFor(int $subtotalMinor): int
    {
        $discount = $this->discountFor($subtotalMinor);

        if ($this->max_discount_per_order_minor !== null) {
            $discount = min($discount, (int) $this->max_discount_per_order_minor);
        }

        return max(0, $discount);
    }

    /**
     * Nombre d'utilisations du code par un même client.
     */
    public function usageCountForUser(int $userId): int
    {
        return Order::query()
            ->where('promo_code_id', $this->id)
            ->where('user_id', $userId)
            ->whereNotIn('status', ['cancelled', 'refunded'])
            ->count();
    }

    /**
     * Cumul des remises réellement accordées (une fois livrées ou en cours).
     */
    public function totalDiscountGranted(): int
    {
        return (int) Order::query()
            ->where('promo_code_id', $this->id)
            ->whereNotIn('status', ['cancelled', 'refunded'])
            ->sum('discount_minor');
    }

    /**
     * Message d'erreur si le code n'est pas utilisable, sinon null.
     */
    public function errorFor(?int $subtotalMinor = null): ?string
    {
        if (! $this->is_active) {
            return 'Ce code promo n\'est plus actif.';
        }

        if ($this->starts_at !== null && $this->starts_at->isFuture()) {
            return 'Ce code promo n\'est pas encore disponible.';
        }

        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return 'Ce code promo a expiré.';
        }

        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return 'Ce code promo a atteint sa limite d\'utilisation.';
        }

        if ($subtotalMinor !== null && $this->min_order_minor !== null && $subtotalMinor < $this->min_order_minor) {
            return 'Le montant minimum pour ce code n\'est pas atteint ('.$this->min_order_minor.' FCFA).';
        }

        return null;
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }

    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'description' => $this->description,
            'discount_type' => $this->discount_type,
            'discount_value' => (int) $this->discount_value,
            'is_fixed' => $this->isFixed(),
            'min_order_minor' => $this->min_order_minor,
        ];
    }
}