<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'amount_minor',
        'currency',
        'method',
        'status',
        'provider',
        'provider_payment_id',
        'gateway_response',
        'paid_at',
        'refunded_at',
        'refunded_amount_minor',
        'fee_minor',
        'net_amount_minor',
        'transaction_id',
        'capture_id',
        'requires_capture',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'refunded_amount_minor' => 'integer',
            'fee_minor' => 'integer',
            'net_amount_minor' => 'integer',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
            'requires_capture' => 'boolean',
            'gateway_response' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }
}