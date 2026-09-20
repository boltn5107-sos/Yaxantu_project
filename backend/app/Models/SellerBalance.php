<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerBalance extends Model
{
    protected $fillable = [
        'seller_id',
        'amount_available',
        'amount_pending',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'amount_available' => 'integer',
            'amount_pending' => 'integer',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }
}