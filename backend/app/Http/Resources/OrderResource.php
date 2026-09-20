<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = $this->whenLoaded('items');

        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status,
            'status_label' => $this->safeStatusLabel(),
            'payment_status' => $this->payment_status,
            'shipping_status' => $this->shipping_status,
            'subtotal' => (int) $this->subtotal_minor,
            'shipping' => (int) $this->shipping_rate_minor,
            'total' => (int) $this->total_minor,
            'currency' => $this->currency,
            'placed_at' => $this->placed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,
            'tracking_number' => $this->tracking_number,
            'items_count' => (int) $items->sum('quantity'),
            'items' => $items->map(function ($item) {
                $snapshot = $item->product_snapshot ?? [];

                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'name' => $snapshot['name'] ?? ($item->product?->name),
                    'slug' => $snapshot['slug'] ?? ($item->product?->slug),
                    'image' => $snapshot['image'] ?? null,
                    'seller' => $snapshot['seller'] ?? ($item->product?->seller?->shop_name),
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (int) $item->unit_price_minor,
                    'total' => (int) $item->total_minor,
                ];
            })->values(),
            'address' => $this->whenLoaded('shippingAddress', fn () => new AddressResource($this->shippingAddress)),
            'payment' => $this->whenLoaded('payments', fn () => $this->payments->map(
                fn ($payment) => new PaymentResource($payment),
            )->first()),
            'delivery' => $this->whenLoaded('delivery', fn () => [
                'status' => $this->delivery->status,
                'provider' => $this->delivery->provider,
                'tracking_number' => $this->delivery->tracking_number,
                'estimated_delivery' => $this->delivery->estimated_delivery?->toIso8601String(),
                'actual_delivery' => $this->delivery->actual_delivery?->toIso8601String(),
            ]),
        ];
    }

    private function safeStatusLabel(): string
    {
        try {
            return OrderStatus::from($this->status)->label();
        } catch (\ValueError) {
            return $this->status;
        }
    }
}