<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerExpense extends Model
{
    protected $fillable = [
        'seller_id',
        'amount_minor',
        'currency',
        'category',
        'incurred_at',
        'description',
        'receipt_path',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'incurred_at' => 'date',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }
}