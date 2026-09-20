<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AffiliateBalance extends Model
{
    protected $fillable = [
        'affiliate_id',
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

    public function affiliate(): BelongsTo
    {
        return $this->belongsTo(Affiliate::class);
    }
}