<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    protected $fillable = [
        'product_id',
        'quantity',
        'reserved_quantity',
        'reorder_level',
        'max_stock',
        'location',
        'tracking_enabled',
        'last_counted_at',
        'batch_number',
        'expiry_date',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'reserved_quantity' => 'integer',
            'reorder_level' => 'integer',
            'max_stock' => 'integer',
            'tracking_enabled' => 'boolean',
            'last_counted_at' => 'datetime',
            'expiry_date' => 'date',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getAvailableQuantity(): int
    {
        return $this->quantity - $this->reserved_quantity;
    }
}