<?php

namespace App\Http\Controllers\Api\V1\Favorite;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Favorite;
use App\Models\Product;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FavoriteController extends Controller
{
    /**
     * Favoris de l'utilisateur (permission favorites.manage).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $products = Product::query()
            ->whereHas('favorites', fn ($q) => $q->where('user_id', $request->user()->id))
            ->with(['images', 'seller'])
            ->get();

        return ProductResource::collection($products);
    }

    /**
     * Ajout d'un produit aux favoris (idempotent).
     */
    public function store(Request $request, int $productId): JsonResponse
    {
        $product = Product::query()->whereKey($productId)->firstOrFail();

        Favorite::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $productId,
        ]);

        AuditService::log(AuditEvent::FavoriteAdded, $product, ['user_id' => $request->user()->id]);

        return response()->json(['message' => 'Ajouté aux favoris.']);
    }

    /**
     * Retrait d'un produit des favoris.
     */
    public function destroy(Request $request, int $productId): JsonResponse
    {
        Product::query()->whereKey($productId)->firstOrFail();

        Favorite::query()
            ->where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->delete();

        AuditService::log(AuditEvent::FavoriteRemoved, Product::query()->find($productId), ['user_id' => $request->user()->id]);

        return response()->json(['message' => 'Retiré des favoris.']);
    }
}