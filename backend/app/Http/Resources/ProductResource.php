<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $images = $this->whenLoaded('images');
        $primary = $this->whenLoaded('images')
            ? $this->images->firstWhere('is_primary', true) ?? $this->images->first()
            : null;

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'short_description' => $this->short_description,
            'description' => $this->description,
            // XOF/FCFA ne possède pas de sous-unité : price_minor est le montant en FCFA.
            'price' => (int) $this->price_minor,
            'currency' => $this->price_currency,
            'stock_quantity' => (int) $this->stock_quantity,
            'in_stock' => (int) $this->stock_quantity > 0,
            'rating_average' => (float) $this->rating_average,
            'rating_count' => (int) $this->rating_count,
            'is_featured' => (bool) $this->is_featured,
            'is_active' => (bool) $this->is_active,
            'requires_shipping' => (bool) $this->requires_shipping,
            'thumbnail' => $primary?->path,
            'images' => $images
                ? $this->images->map(fn ($image) => [
                    'id' => $image->id,
                    'path' => $image->path,
                    'alt_text' => $image->alt_text,
                    'is_primary' => (bool) $image->is_primary,
                ])->values()
                : [],
            'seller' => $this->whenLoaded('seller', fn () => [
                'id' => $this->seller->id,
                'shop_name' => $this->seller->shop_name,
                'slug' => $this->seller->slug,
                'logo' => $this->seller->logo_path,
                'verification_level' => (int) $this->seller->verification_level,
                'verified' => $this->seller->verified_at !== null,
            ]),
            'category' => $this->whenLoaded('category', fn () => new CategoryResource($this->category)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
