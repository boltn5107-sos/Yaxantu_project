<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = [
        'cart_id',
        'product_id',
        'product_variant_id',
        'product_snapshot',
        'variant_snapshot',
        'quantity',
        'unit_price_minor',
        'unit_price_currency',
        'discount_minor',
        'total_minor',
        'tax_rate_minor',
        'weight',
        'requires_shipping',
        'seller_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price_minor' => 'integer',
            'discount_minor' => 'integer',
            'total_minor' => 'integer',
            'tax_rate_minor' => 'decimal:2',
            'weight' => 'decimal:3',
            'product_snapshot' => 'array',
            'variant_snapshot' => 'array',
        ];
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
}