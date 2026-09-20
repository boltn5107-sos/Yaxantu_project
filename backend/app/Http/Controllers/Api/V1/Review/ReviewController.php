<?php

namespace App\Http\Controllers\Api\V1\Review;

use App\Enums\AuditEvent;
use App\Enums\ReviewStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Http\Requests\Api\V1\Review\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    /**
     * Avis publics et approuvés d'un produit (permission reviews.view).
     */
    public function index(Product $product): AnonymousResourceCollection
    {
        return ReviewResource::collection(
            $product->reviews()
                ->where('status', ReviewStatus::Approved->value)
                ->with('user')
                ->orderByDesc('created_at')
                ->paginate(10),
        );
    }

    /**
     * Publication d'un avis (permission reviews.create).
     *
     * L'avis n'est visible qu'après approbation (modération, §20).
     * Le badge "achat vérifié" est attribué par le serveur si l'utilisateur a
     * effectivement acheté le produit.
     */
    public function store(StoreReviewRequest $request, Product $product): JsonResponse
    {
        $data = $request->validated();

        $orderItem = OrderItem::query()
            ->where('product_id', $product->id)
            ->whereHas('order', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id)
                    ->whereIn('status', ['paid', 'preparation', 'shipped', 'in_delivery', 'delivered']);
            })
            ->first();

        $sellerId = $product->seller_id;

        $review = Review::create([
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            'seller_id' => $sellerId,
            'order_id' => $orderItem?->order_id,
            'rating' => $data['rating'],
            'title' => $data['title'] ?? null,
            'content' => $data['content'] ?? null,
            'is_verified_purchase' => $orderItem !== null,
            'is_approved' => false,
            'status' => ReviewStatus::Pending->value,
        ]);

        AuditService::log(AuditEvent::ReviewCreated, $review);

        return (new ReviewResource($review))
            ->additional(['message' => 'Merci pour votre avis. Il sera publié après modération.'])
            ->response()
            ->setStatusCode(200);
    }
}