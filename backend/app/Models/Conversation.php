<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = ['buyer_id', 'seller_id', 'last_message_at'];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class, 'seller_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->latest();
    }

    /** L'utilisateur connecté participe-t-il à cette conversation ? */
    public function isParticipant(User $user): bool
    {
        return (int) $user->getKey() === (int) $this->buyer_id
            || (int) $user->getKey() === (int) $this->seller?->user_id;
    }

    /** Le partenaire de l'utilisateur (acheteur ou vendeur). */
    public function counterpart(User $user): ?Model
    {
        if ((int) $user->getKey() === (int) $this->seller?->user_id) {
            return $this->buyer()->first();
        }

        return $this->seller()->first();
    }
}