<?php

namespace App\Http\Resources;

use App\Models\Cart;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Cart */
class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = $this->whenLoaded('items');

        return [
            'id' => $this->id,
            'status' => $this->status,
            'currency' => $this->currency,
            'items' => $items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product' => [
                    'id' => $item->product?->id,
                    'name' => $item->product_snapshot['name'] ?? $item->product?->name,
                    'slug' => $item->product_snapshot['slug'] ?? $item->product?->slug,
                    'image' => $item->product_snapshot['image'] ?? null,
                    'seller' => $item->product_snapshot['seller'] ?? $item->product?->seller?->shop_name,
                    'seller_slug' => $item->product_snapshot['seller_slug'] ?? $item->product?->seller?->slug,
                    'in_stock' => $item->product !== null && (int) $item->product->stock_quantity > 0,
                ],
                'quantity' => (int) $item->quantity,
                'unit_price' => (int) $item->unit_price_minor,
                'total' => (int) $item->total_minor,
                'requires_shipping' => (bool) $item->requires_shipping,
            ])->values(),
            'subtotal' => (int) $this->items->sum(fn ($item) => $item->total_minor),
            'shipping' => (int) $this->shipping_rate_minor,
            'total' => (int) ($this->total_minor + (int) $this->shipping_rate_minor),
            'count' => (int) $this->items->sum('quantity'),
        ];
    }
}