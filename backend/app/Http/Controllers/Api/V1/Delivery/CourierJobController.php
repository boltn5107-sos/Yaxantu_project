<?php

namespace App\Http\Controllers\Api\V1\Delivery;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Delivery;
use App\Models\Order;
use App\Services\AuditService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Courses du livreur (phase 3) : réception avec itinéraire et contact
 * acheteur/vendeur, confirmation de livraison par photo ou signature simple.
 */
class CourierJobController extends Controller
{
    public function __construct(
        private readonly OrderService $orders,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $courier = $request->user()->courier ?: abort(403, 'Profil Livreur requis.');

        $jobs = Delivery::query()
            ->where('courier_id', $courier->id)
            ->whereIn('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
            ->with(['order.items', 'order.user', 'order.seller.user', 'order.shippingAddress'])
            ->orderByDesc('assigned_at')
            ->get();

        return response()->json([
            'data' => $jobs->map(fn (Delivery $d) => $this->job($d)),
        ]);
    }

    public function pickup(Request $request, Delivery $delivery): JsonResponse
    {
        $courier = $request->user()->courier ?: abort(403, 'Profil Livreur requis.');

        if ($delivery->courier_id !== $courier->id) {
            abort(403);
        }

        if ($delivery->status !== 'assigned') {
            throw ValidationException::withMessages(['delivery' => ['Cette course n\'est pas prête à être récupérée.']]);
        }

        $delivery->forceFill(['status' => 'picked_up', 'picked_at' => now()])->save();
        $delivery->order?->forceFill(['status' => 'in_delivery', 'shipping_status' => 'out_for_delivery'])->save();

        AuditService::log(AuditEvent::OrderUpdated, $delivery->order, ['action' => 'courier_pickup']);

        return response()->json([
            'message' => 'Colis récupéré. En route !',
            'data' => $this->job($delivery->fresh(['order.items', 'order.user', 'order.shippingAddress'])),
        ]);
    }

    public function deliver(Request $request, Delivery $delivery): JsonResponse
    {
        $courier = $request->user()->courier ?: abort(403, 'Profil Livreur requis.');

        if ($delivery->courier_id !== $courier->id) {
            abort(403);
        }

        $validated = $request->validate([
            'proof' => ['nullable', 'image', 'max:6144'],
            'signature' => ['nullable', 'image', 'max:6144'],
            'notes' => ['nullable', 'string', 'max:500'],
            'received' => ['nullable', 'boolean'],
        ]);

        $proofPath = null;

        if ($request->hasFile('proof')) {
            $proofPath = $request->file('proof')->store('couriers/deliveries', 'public');
        } elseif ($request->hasFile('signature')) {
            $proofPath = $request->file('signature')->store('couriers/deliveries', 'public');
        } elseif ((bool) $validated['received']) {
            $proofPath = $delivery->delivered_proof_path;
        }

        if ($proofPath === null && ! blank($delivery->delivered_proof_path)) {
            $proofPath = $delivery->delivered_proof_path;
        }

        try {
            $order = $this->orders->markDelivered($delivery->order, $proofPath, $validated['notes'] ?? null);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['delivery' => [$e->getMessage()]]);
        }

        return response()->json([
            'message' => 'Livraison confirmée. Merci !',
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
            ],
        ]);
    }

    private function job(Delivery $delivery): array
    {
        $order = $delivery->order;

        return [
            'delivery_id' => $delivery->id,
            'status' => $delivery->status,
            'order_number' => $order?->order_number,
            'tracking_number' => $delivery->tracking_number,
            'assigned_at' => $delivery->assigned_at?->toIso8601String(),
            'picked_at' => $delivery->picked_at?->toIso8601String(),
            'estimated_delivery' => $delivery->estimated_delivery?->toIso8601String(),
            'seller' => $order?->seller?->user?->name ?? $order?->seller?->shop_name,
            'seller_phone' => $order?->seller?->user?->phone,
            'buyer' => $order?->user?->name,
            'buyer_phone' => $order?->user?->phone,
            'items' => $order?->items?->map(function ($item) {
                $snapshot = $item->product_snapshot ?? [];

                return [
                    'name' => $snapshot['name'] ?? $item->product?->name,
                    'quantity' => (int) $item->quantity,
                ];
            })->values(),
            'address' => $order?->shippingAddress ? [
                'address_line1' => $order->shippingAddress->address_line1,
                'address_line2' => $order->shippingAddress->address_line2,
                'city' => $order->shippingAddress->city,
                'phone' => $order->shippingAddress->phone,
            ] : null,
            'notes' => $delivery->courier_notes,
        ];
    }
}