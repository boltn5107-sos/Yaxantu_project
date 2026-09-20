<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Enums\AuditEvent;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Review;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Avis des clients sur les produits de ma boutique + réponses publiques
 * (permission reviews.reply octroyée au profil Vendeur).
 */
class SellerReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $validated = $request->validate([
            'status' => ['nullable', 'in:approved,pending,rejected,hidden'],
            'with_reply' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Review::query()
            ->where('seller_id', $seller->id)
            ->whereNull('parent_id')
            ->with(['user:id,name', 'product:id,name,slug', 'replies.user:id,name'])
            ->orderByDesc('created_at');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if ($request->boolean('with_reply')) {
            $query->whereHas('replies');
        } elseif ($request->boolean('with_reply') === false && array_key_exists('with_reply', $validated)) {
            $query->whereDoesntHave('replies');
        }

        $reviews = $query->paginate(15)->withQueryString();

        return response()->json([
            'data' => $reviews->map(fn (Review $review) => [
                'id' => $review->id,
                'rating' => (int) $review->rating,
                'title' => $review->title,
                'content' => $review->content,
                'status' => $review->status,
                'status_label' => ReviewStatus::tryFrom($review->status)?->label() ?? $review->status,
                'author' => $review->user?->name ?? 'Utilisateur Yaxantu',
                'is_verified_purchase' => (bool) $review->is_verified_purchase,
                'product' => $review->product ? [
                    'id' => $review->product->id,
                    'slug' => $review->product->slug,
                    'name' => $review->product->name,
                ] : null,
                'reply' => $review->replies->first() ? [
                    'content' => $review->replies->first()->content,
                    'updated_at' => $review->replies->first()->updated_at?->toIso8601String(),
                ] : null,
                'created_at' => $review->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    /**
     * Répondre publiquement à un avis (ou mettre à jour sa réponse).
     */
    public function reply(Request $request, Review $review): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        if ((int) $review->seller_id !== (int) $seller->id) {
            abort(403, 'Cet avis ne concerne pas votre boutique.');
        }

        if ($review->parent_id !== null) {
            throw ValidationException::withMessages(['review' => ['Impossible de répondre à une réponse.']]);
        }

        if ($review->status !== ReviewStatus::Approved->value) {
            throw ValidationException::withMessages(['review' => ['Réponse possible uniquement sur un avis publié.']]);
        }

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ]);

        $reply = $review->replies()->first();

        if ($reply === null) {
            $reply = $review->replies()->create([
                'product_id' => $review->product_id,
                'order_id' => null,
                'user_id' => $request->user()->id,
                'seller_id' => $seller->id,
                'rating' => null,
                'content' => $validated['content'],
                'is_approved' => true,
                'status' => ReviewStatus::Approved->value,
            ]);
        } else {
            $reply->forceFill(['content' => $validated['content']])->save();
        }

        AuditService::log(AuditEvent::ReviewCreated, $reply, ['parent_id' => $review->id]);

        return response()->json([
            'message' => 'Réponse publiée sur l\'avis.',
            'data' => [
                'id' => $review->id,
                'reply' => [
                    'content' => $reply->content,
                    'updated_at' => $reply->updated_at?->toIso8601String(),
                ],
            ],
        ]);
    }
}