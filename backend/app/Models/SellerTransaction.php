<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerTransaction extends Model
{
    protected $fillable = [
        'seller_id',
        'type',
        'direction',
        'amount_minor',
        'currency',
        'commission_minor',
        'fee_minor',
        'net_minor',
        'order_id',
        'payout_id',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'commission_minor' => 'integer',
            'fee_minor' => 'integer',
            'net_minor' => 'integer',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}