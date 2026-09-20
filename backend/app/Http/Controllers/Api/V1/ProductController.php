<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    /**
     * Catalogue public : recherche, filtres visuels et tri.
     *
     * Aucun filtre ne dépend de l'IA : la recherche classique doit toujours
     * fonctionner (cf. cahier des charges §25).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:100'],
            'seller' => ['nullable', 'string', 'max:100'],
            'min_price' => ['nullable', 'integer', 'min:0'],
            'max_price' => ['nullable', 'integer', 'min:0'],
            'featured' => ['nullable', 'boolean'],
            'in_stock' => ['nullable', 'boolean'],
            'verified' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'in:newest,price_asc,price_desc,rating,popular'],
            'per_page' => ['nullable', 'integer', 'between:1,50'],
        ]);

        $query = Product::query()
            ->with(['images', 'seller', 'category.translations'])
            ->where('is_active', true)
            ->where('visibility', 'public')
            ->whereHas('seller', fn (Builder $q) => $q->where('status', 'active'));

        $this->applyFilters($query, $filters);
        $this->applySort($query, $filters['sort'] ?? 'newest');

        return ProductResource::collection(
            $query->paginate($filters['per_page'] ?? 15)->withQueryString(),
        );
    }

    /**
     * Fiche produit publique.
     */
    public function show(string $slug): ProductResource
    {
        $product = Product::query()
            ->with(['images', 'seller', 'category.translations', 'variants', 'inventory'])
            ->where('slug', $slug)
            ->where('is_active', true)
            ->where('visibility', 'public')
            ->firstOrFail();

        return new ProductResource($product);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when(
            $filters['q'] ?? null,
            function (Builder $q, string $search) {
                $term = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';

                $q->where(function (Builder $inner) use ($term) {
                    $inner->where('name', 'like', $term)
                        ->orWhere('short_description', 'like', $term)
                        ->orWhere('description', 'like', $term);
                });
            },
        );

        $query->when(
            $filters['category'] ?? null,
            fn (Builder $q, string $slug) => $q->whereHas('category', fn (Builder $c) => $c->where('slug', $slug)),
        );

        $query->when(
            $filters['seller'] ?? null,
            fn (Builder $q, string $slug) => $q->whereHas('seller', fn (Builder $s) => $s->where('slug', $slug)),
        );

        $query->when(
            isset($filters['min_price']),
            fn (Builder $q) => $q->where('price_minor', '>=', (int) $filters['min_price']),
        );

        $query->when(
            isset($filters['max_price']),
            fn (Builder $q) => $q->where('price_minor', '<=', (int) $filters['max_price']),
        );

        $query->when(
            (bool) ($filters['featured'] ?? false),
            fn (Builder $q) => $q->where('is_featured', true),
        );

        $query->when(
            (bool) ($filters['in_stock'] ?? false),
            fn (Builder $q) => $q->where('stock_quantity', '>', 0),
        );

        $query->when(
            (bool) ($filters['verified'] ?? false),
            fn (Builder $q) => $q->whereHas('seller', fn (Builder $s) => $s->whereNotNull('verified_at')),
        );
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'price_asc' => $query->orderBy('price_minor'),
            'price_desc' => $query->orderByDesc('price_minor'),
            'rating' => $query->orderByDesc('rating_average')->orderByDesc('rating_count'),
            'popular' => $query->orderByDesc('rating_count')->orderByDesc('created_at'),
            'newest' => $query->orderByDesc('created_at'),
            default => $query->orderByDesc('is_featured')->orderByDesc('created_at'),
        };
    }
}
