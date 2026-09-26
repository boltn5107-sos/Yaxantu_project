<?php

namespace App\Http\Resources;

use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Review */
class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $reply = $this->replies->first();

        return [
            'id' => $this->id,
            'rating' => (int) $this->rating,
            'title' => $this->title,
            'content' => $this->content,
            'status' => $this->status,
            'author' => $this->user?->name ?? 'Utilisateur Taaba-taaba',
            'is_verified_purchase' => (bool) $this->is_verified_purchase,
            'created_at' => $this->created_at?->toIso8601String(),
            // Réponse publique du vendeur (parent_id renseigné).
            'reply' => $reply && $reply->content
                ? [
                    'content' => $reply->content,
                    'author' => $reply->user?->name ?? '',
                    'created_at' => $reply->created_at?->toIso8601String(),
                ]
                : null,
        ];
    }
}