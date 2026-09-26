<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Product;
use App\Models\Seller;
use App\Support\ImageHash;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Produits du vendeur (phase 3).
 *
 * Règle d'or : on ne peut PAS ajouter un produit sans avoir d'abord créé sa
 * boutique (is_onboarded). La gestion des produits est bloquée jusqu'à la
 * fin des 5 étapes d'onboarding.
 */
class SellerProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $seller = $this->seller($request, requireOnboarded: false);

        $products = $seller->products()
            ->with(['images', 'category.translations'])
            ->orderByDesc('created_at')
            ->paginate(30);

        return response()->json([
            'data' => collect($products->items())->map(fn (Product $product) => $this->serialize($product))->values(),
            'meta' => ['total' => $products->total(), 'current_page' => $products->currentPage(), 'last_page' => $products->lastPage()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $seller = $this->seller($request, requireOnboarded: true);

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:190'],
            'price_minor' => ['required', 'integer', 'min:50'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'category_id' => ['required', 'exists:categories,id'],
            'short_description' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:4000'],
            'requires_shipping' => ['nullable', 'boolean'],
            'length_days' => ['nullable', 'integer', 'between:1,30'],
            'images' => ['nullable', 'array', 'max:6'],
            'images.*' => ['file', 'max:25600', 'mimes:jpg,jpeg,png,webp,gif,bmp,mp4,webm,mov,m4v,ogv'],
        ]);

        try {
            $product = $seller->products()->create([
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'slug' => $this->uniqueSlug(Str::slug($validated['name']), $seller),
                'description' => $validated['description'] ?? null,
                'short_description' => $validated['short_description'] ?? null,
                'price_minor' => (int) $validated['price_minor'],
                'price_currency' => $seller->currency,
                'stock_quantity' => (int) $validated['stock_quantity'],
                'requires_shipping' => (bool) ($validated['requires_shipping'] ?? true),
                'length_days' => (int) ($validated['length_days'] ?? 2),
                'is_active' => true,
                'is_physical' => true,
                'visibility' => 'public',
                'status' => 'active',
                'created_by' => $seller->user_id,
            ]);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['name' => [$e->getMessage()]]);
        }

        $this->attachMedia($product, $request);

        return response()->json([
            'message' => 'Produit ajouté à votre boutique.',
            'data' => $this->serialize($product->fresh()->load(['images', 'category'])),
        ], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $seller = $this->seller($request, requireOnboarded: true);
        $this->owns($seller, $product);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:190'],
            'price_minor' => ['sometimes', 'integer', 'min:50'],
            'stock_quantity' => ['sometimes', 'integer', 'min:0'],
            'category_id' => ['sometimes', 'exists:categories,id'],
            'short_description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:4000'],
            'requires_shipping' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'images' => ['sometimes', 'array', 'max:6'],
            'images.*' => ['file', 'max:25600', 'mimes:jpg,jpeg,png,webp,gif,bmp,mp4,webm,mov,m4v,ogv'],
        ]);

        if (isset($validated['name']) && $validated['name'] !== $product->name) {
            $product->name = $validated['name'];
            $product->slug = $this->uniqueSlug(Str::slug($validated['name']), $seller, $product);
        }

        foreach ([
            'price_minor', 'stock_quantity', 'category_id', 'short_description',
            'description', 'requires_shipping', 'is_active',
        ] as $field) {
            if (array_key_exists($field, $validated)) {
                $product->{$field} = $validated[$field];
            }
        }

        $product->save();

        if ($request->hasFile('images')) {
            $this->attachMedia($product, $request);
        }

        return response()->json([
            'message' => 'Produit mis à jour.',
            'data' => $this->serialize($product->fresh()->load(['images', 'category'])),
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $seller = $this->seller($request, requireOnboarded: true);
        $this->owns($seller, $product);

        $product->delete();

        return response()->json(['message' => 'Produit supprimé de votre boutique.']);
    }

    private function attachMedia(Product $product, Request $request): void
    {
        if (! $request->hasFile('images')) {
            return;
        }

        $nextOrder = (int) $product->images()->max('sort_order');

        foreach ($request->file('images') as $index => $file) {
            $path = $file->store('products', 'public');
            $kind = Media::kind($file->getMimeType(), $path);

            $product->images()->create([
                'path' => $path,
                'alt_text' => $product->name,
                'is_primary' => $product->images()->count() === 0 && $index === 0,
                'sort_order' => $nextOrder + $index + 1,
                'file_size' => (int) $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'kind' => $kind,
                'image_hash' => $kind === 'image'
                    ? ImageHash::compute(Storage::disk('public')->path($path))
                    : null,
            ]);
        }
    }

    private function serialize(Product $product): array
    {
        $images = $product->relationLoaded('images') ? $product->images : collect();

        $primary = $images
            ->filter(fn ($image) => $image->kind === 'image')
            ->firstWhere('is_primary', true)
            ?? $images->filter(fn ($image) => $image->kind === 'image')->first();

        $categoryLoaded = $product->relationLoaded('category');
        $toUrl = fn (?string $path) => $path === null
            ? null
            : \Illuminate\Support\Facades\Storage::disk('public')->url($path);

        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'name' => $product->name,
            'short_description' => $product->short_description,
            'description' => $product->description,
            'price' => (int) $product->price_minor,
            'currency' => $product->price_currency,
            'stock_quantity' => (int) $product->stock_quantity,
            'in_stock' => (int) $product->stock_quantity > 0,
            'is_active' => (bool) $product->is_active,
            'requires_shipping' => (bool) $product->requires_shipping,
            'length_days' => (int) $product->length_days,
            'thumbnail' => $product->relationLoaded('images') ? $toUrl($primary?->path) : null,
            'images' => $product->relationLoaded('images')
                ? $product->images->map(fn ($image) => [
                    'id' => $image->id,
                    'path' => $toUrl($image->path),
                    'alt_text' => $image->alt_text,
                    'is_primary' => (bool) $image->is_primary,
                    'kind' => $image->kind ?? 'image',
                ])->values()
                : [],
            'category' => $categoryLoaded ? [
                'id' => $product->category->id,
                'slug' => $product->category->slug,
                'name' => $product->category->translatedName(),
            ] : null,
            'created_at' => $product->created_at?->toIso8601String(),
        ];
    }

    private function uniqueSlug(string $slug, Seller $seller, ?Product $ignore = null): string
    {
        $candidate = $slug ?: 'produit-'.$seller->id;
        $i = 0;

        while (Product::query()
            ->where('slug', $candidate)
            ->when($ignore, fn ($q) => $q->where('id', '!=', $ignore->id))
            ->exists()
        ) {
            $candidate = $slug.'-'.(++$i);
        }

        return $candidate;
    }

    private function owns(Seller $seller, Product $product): void
    {
        if ((int) $product->seller_id !== (int) $seller->id) {
            abort(403, 'Ce produit ne vous appartient pas.');
        }
    }

    private function seller(Request $request, bool $requireOnboarded): Seller
    {
        $seller = $request->user()->seller;

        if ($seller === null) {
            throw ValidationException::withMessages([
                'profile' => ['Choisissez d\'abord le profil Vendeur.'],
            ]);
        }

        if ($requireOnboarded && ! $seller->is_onboarded) {
            abort(403, 'Créez d\'abord votre boutique (5 étapes) avant d\'ajouter un produit.');
        }

        return $seller;
    }
}