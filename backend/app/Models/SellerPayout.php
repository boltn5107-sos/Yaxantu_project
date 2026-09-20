<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerPayout extends Model
{
    protected $fillable = [
        'seller_id',
        'balance_id',
        'amount_minor',
        'currency',
        'method',
        'status',
        'requested_at',
        'processed_at',
        'processed_by',
        'transaction_id',
        'fee_minor',
        'net_amount_minor',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'fee_minor' => 'integer',
            'net_amount_minor' => 'integer',
            'requested_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function balance(): BelongsTo
    {
        return $this->belongsTo(SellerBalance::class, 'balance_id');
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}