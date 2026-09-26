<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Seller extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'subscription_plan_id',
        'shop_name',
        'slug',
        'description',
        'logo_path',
        'status',
        'verification_level',
        'verified_at',
        'commission_override_bps',
        'currency',
        'onboarding_step',
        'is_onboarded',
        'main_category_id',
        'location_lat',
        'location_lng',
        'location_address',
        'payout_method',
        'payout_account',
        'sponsor_id',
        'trust_score',
        'onboarded_at',
        'monthly_goal_minor',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
            'onboarded_at' => 'datetime',
            'verification_level' => 'integer',
            'commission_override_bps' => 'integer',
            'onboarding_step' => 'integer',
            'is_onboarded' => 'boolean',
            'location_lat' => 'decimal:7',
            'location_lng' => 'decimal:7',
            'trust_score' => 'integer',
            'monthly_goal_minor' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class);
    }

    public function verifications(): HasMany
    {
        return $this->hasMany(SellerVerification::class);
    }

    public function balance(): HasOne
    {
        return $this->hasOne(SellerBalance::class);
    }

    public function mainCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'main_category_id');
    }

    public function sponsor(): BelongsTo
    {
        return $this->belongsTo(Seller::class, 'sponsor_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SellerTransaction::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(SellerPayout::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(SellerExpense::class);
    }

    public function trustScoreEvents(): HasMany
    {
        return $this->hasMany(TrustScoreEvent::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function shopVisits(): HasMany
    {
        return $this->hasMany(ShopVisit::class);
    }
}
