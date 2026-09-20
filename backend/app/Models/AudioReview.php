<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AudioReview extends Model
{
    protected $fillable = [
        'review_id',
        'file_path',
        'duration',
        'mime_type',
        'file_size',
        'transcript',
        'status',
        'moderator_id',
        'moderation_reason',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'duration' => 'float',
            'file_size' => 'integer',
            'status' => 'boolean',
            'uploaded_at' => 'datetime',
        ];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderator_id');
    }
}