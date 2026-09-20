<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'status',
        'shipping_address_id',
        'billing_address_id',
        'shipping_method',
        'shipping_rate_minor',
        'tax_rate_minor',
        'discount_minor',
        'total_minor',
        'currency',
        'expires_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'shipping_rate_minor' => 'integer',
            'tax_rate_minor' => 'integer',
            'discount_minor' => 'integer',
            'total_minor' => 'integer',
            'expires_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shippingAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'shipping_address_id');
    }

    public function billingAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'billing_address_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function getTotalQuantity(): int
    {
        return $this->items->sum('quantity');
    }
}