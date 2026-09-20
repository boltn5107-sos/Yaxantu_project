<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AuditEvent;
use App\Enums\OrderStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    /**
     * Toutes les commandes de la place (filtres statut / recherche).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:40'],
            'payment_status' => ['nullable', 'string', 'max:40'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Order::query()
            ->with(['user:id,name', 'seller:id,shop_name'])
            ->withCount('items as items_count');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['payment_status'])) {
            $query->where('payment_status', $validated['payment_status']);
        }

        if (! empty($validated['search'])) {
            $search = '%'.$validated['search'].'%';
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', $search)
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $search))
                    ->orWhereHas('seller', fn ($s) => $s->where('shop_name', 'like', $search));
            });
        }

        $orders = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $orders->map(fn (Order $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'status_label' => $this->statusLabel($order->status),
                'payment_status' => $order->payment_status,
                'shipping_status' => $order->shipping_status,
                'subtotal' => (int) $order->subtotal_minor,
                'shipping' => (int) $order->shipping_rate_minor,
                'discount' => (int) $order->discount_minor,
                'total' => (int) $order->total_minor,
                'currency' => $order->currency,
                'items_count' => (int) $order->items_count,
                'customer' => $order->user?->name,
                'shop' => $order->seller?->shop_name,
                'placed_at' => $order->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with(['user:id,name,email,phone', 'seller:id,shop_name', 'items', 'shippingAddress', 'payments', 'delivery', 'promoCode'])
            ->firstOrFail();

        $resource = (new OrderResource($order))->toArray($request);
        $resource['customer'] = $order->user?->name;
        $resource['customer_email'] = $order->user?->email;
        $resource['customer_phone'] = $order->user?->phone;
        $resource['shop'] = $order->seller?->shop_name;

        return response()->json(['data' => $resource]);
    }

    /**
     * Faire avancer / corriger le statut d'une commande.
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(array_map(fn (OrderStatus $s) => $s->value, OrderStatus::cases()))],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $order->update([
            'status' => $validated['status'],
            'cancelled_at' => $validated['status'] === OrderStatus::Cancelled->value ? now() : null,
            'cancellation_reason' => $validated['status'] === OrderStatus::Cancelled->value ? ($validated['reason'] ?? null) : null,
            'completed_at' => in_array($validated['status'], [OrderStatus::Delivered->value, OrderStatus::Refunded->value], true) ? now() : null,
        ]);

        \App\Models\Notification::create([
            'user_id' => $order->user_id,
            'type' => 'order.status_changed',
            'title' => 'Votre commande a changé de statut',
            'message' => 'La commande '.$order->order_number.' est maintenant « '.$this->statusLabel($validated['status']).' ».',
            'data' => ['order_number' => $order->order_number, 'status' => $validated['status']],
            'action_url' => '/orders/'.$order->order_number,
            'priority' => 'normal',
        ]);

        AuditService::log(AuditEvent::OrderUpdated, $order, [
            'status' => $validated['status'],
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json(['message' => 'Statut mis à jour.']);
    }

    /**
     * Annulation d'urgence (avec motif imposé).
     */
    public function cancel(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $order->update([
            'status' => OrderStatus::Cancelled->value,
            'cancelled_at' => now(),
            'cancellation_reason' => $validated['reason'],
        ]);

        \App\Models\Notification::create([
            'user_id' => $order->user_id,
            'type' => 'order.cancelled',
            'title' => 'Commande annulée',
            'message' => 'Votre commande '.$order->order_number.' a été annulée : '.$validated['reason'],
            'data' => ['order_number' => $order->order_number],
            'action_url' => '/orders/'.$order->order_number,
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::OrderCancelled, $order, ['reason' => $validated['reason']]);

        return response()->json(['message' => 'Commande annulée.']);
    }

    private function statusLabel(string $status): string
    {
        try {
            return OrderStatus::from($status)->label();
        } catch (\ValueError) {
            return $status;
        }
    }
}