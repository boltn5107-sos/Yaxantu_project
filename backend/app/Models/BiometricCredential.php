<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiometricCredential extends Model
{
    protected $fillable = [
        'user_id',
        'credential_id',
        'public_key',
        'platform',
        'challenge',
        'challenge_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'challenge_expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}