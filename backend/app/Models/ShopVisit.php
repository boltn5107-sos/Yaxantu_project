<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShopVisit extends Model
{
    use HasFactory;

    public const KIND_VISIT = 'visit';

    public const KIND_SHARE = 'share';

    protected $fillable = [
        'seller_id',
        'kind',
        'channel',
        'ref_user_id',
        'ip',
        'user_agent',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function refUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ref_user_id');
    }
}