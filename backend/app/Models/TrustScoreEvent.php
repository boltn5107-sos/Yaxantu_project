<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrustScoreEvent extends Model
{
    protected $fillable = [
        'seller_id',
        'delta',
        'score_after',
        'reason',
        'data',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'delta' => 'integer',
            'score_after' => 'integer',
            'data' => 'array',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }
}