<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'is_read',
        'read_at',
        'action_url',
        'action_text',
        'priority',
        'expires_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'read_at' => 'datetime',
            'data' => 'array',
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Respecte la préférence "notifications dans l'app" de l'utilisateur :
     * aucune notification in-app n'est créée pour un utilisateur qui les a
     * désactivées. Les notifications "sms.out" (code de connexion) sont
     * toujours créées : elles servent de trace du SMS simulé.
     */
    protected static function booted(): void
    {
        static::creating(function (self $notification): bool {
            if ($notification->type === 'sms.out') {
                return true;
            }

            return $notification->user?->notify_inapp !== false;
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}