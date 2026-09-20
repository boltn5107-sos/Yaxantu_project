<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Courier extends Model
{
    protected $fillable = [
        'user_id',
        'status',
        'onboarding_step',
        'is_onboarded',
        'transport_type',
        'zone_lat',
        'zone_lng',
        'zone_radius_km',
        'zone_address',
        'identity_photo_path',
        'selfie_path',
        'payout_method',
        'payout_account',
        'available',
        'approved_at',
        'reviewed_by',
        'reviewed_at',
        'reject_reason',
    ];

    protected function casts(): array
    {
        return [
            'onboarding_step' => 'integer',
            'is_onboarded' => 'boolean',
            'zone_lat' => 'decimal:7',
            'zone_lng' => 'decimal:7',
            'zone_radius_km' => 'integer',
            'available' => 'boolean',
            'approved_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }
}