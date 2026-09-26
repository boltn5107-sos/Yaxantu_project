<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'seller_id',
        'order_number',
        'status',
        'payment_status',
        'shipping_status',
        'shipping_address_id',
        'billing_address_id',
        'shipping_rate_minor',
        'tax_rate_minor',
        'discount_minor',
        'promo_code_id',
        'subtotal_minor',
        'total_minor',
        'currency',
        'placed_at',
        'completed_at',
        'cancelled_at',
        'cancellation_reason',
        'payment_intent_id',
        'refund_status',
        'tracking_number',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'shipping_rate_minor' => 'integer',
            'tax_rate_minor' => 'decimal:2',
            'discount_minor' => 'integer',
            'subtotal_minor' => 'integer',
            'total_minor' => 'integer',
            'placed_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
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
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class);
    }

    public function dispute(): HasOne
    {
        return $this->hasOne(Dispute::class);
    }

    public function promoCode(): BelongsTo
    {
        return $this->belongsTo(PromoCode::class);
    }

    public function getTotalQuantity(): int
    {
        return $this->items->sum('quantity');
    }
}