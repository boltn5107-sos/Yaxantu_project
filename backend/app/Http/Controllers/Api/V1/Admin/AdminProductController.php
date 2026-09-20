<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Product;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    /**
     * Catalogue complet : modération + mise en avant.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'visibility' => ['nullable', 'in:active,hidden,featured,all'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Product::query()
            ->with(['seller:id,user_id,shop_name', 'category:id,name,slug'])
            ->withCount('orderItems as sold_count')
            ->withSum('orderItems as sold_quantity', 'quantity');

        if (! empty($validated['search'])) {
            $query->where('name', 'like', '%'.$validated['search'].'%');
        }

        match ($validated['visibility'] ?? 'all') {
            'active' => $query->where('is_active', true),
            'hidden' => $query->where('is_active', false),
            'featured' => $query->where('is_featured', true),
            default => null,
        };

        $products = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $products->map(fn (Product $product) => [
                'id' => $product->id,
                'slug' => $product->slug,
                'name' => $product->name,
                'price' => (int) $product->price_minor,
                'currency' => $product->price_currency ?? 'XOF',
                'stock_quantity' => (int) $product->stock_quantity,
                'is_active' => (bool) $product->is_active,
                'is_featured' => (bool) $product->is_featured,
                'status' => $product->status,
                'visibility' => $product->visibility,
                'rating_average' => (float) $product->rating_average,
                'sold_count' => (int) ($product->sold_count ?? 0),
                'sold_quantity' => (int) ($product->sold_quantity ?? 0),
                'seller' => $product->seller ? [
                    'id' => $product->seller->id,
                    'shop_name' => $product->seller->shop_name,
                ] : null,
                'category' => $product->category ? [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ] : null,
                'created_at' => $product->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * Modérer un produit : masquer / activer / mettre en avant / stock.
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
        ]);

        $product->update(array_filter([
            'is_active' => $validated['is_active'] ?? null,
            'is_featured' => $validated['is_featured'] ?? null,
            'stock_quantity' => $validated['stock_quantity'] ?? null,
        ], fn ($v) => $v !== null));

        AuditService::log(AuditEvent::SellerUpdated, $product, ['moderated' => $validated]);

        return response()->json(['message' => 'Produit mis à jour.']);
    }
}