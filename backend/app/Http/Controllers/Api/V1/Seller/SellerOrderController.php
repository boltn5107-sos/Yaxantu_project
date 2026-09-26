<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Enums\OrderStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Commission;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Gestion des commandes du vendeur (phase 3) :
 * liste segmentée (Nouvelles / En cours / Terminées / Litiges), actions
 * rapides (Accepter / Refuser / Expédier / Livrer) et ligne de calcul
 * transparente (prix de vente, commission, frais, montant net reçu).
 */
class SellerOrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orders,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $seller = $this->seller($request);
        $segment = $request->query('segment', 'new');

        $query = Order::query()
            ->where('seller_id', $seller->id)
            ->with(['items', 'payments', 'dispute'])
            ->orderByDesc('placed_at');

        $query = match ($segment) {
            'ongoing' => $query->whereIn('status', [
                OrderStatus::Preparation->value,
                OrderStatus::Shipped->value,
                OrderStatus::InDelivery->value,
            ]),
            'completed' => $query->whereIn('status', [
                OrderStatus::Delivered->value,
                OrderStatus::Refunded->value,
            ]),
            'disputes' => $query->whereHas('dispute'),
            default => $query->whereIn('status', [
                OrderStatus::PaymentPending->value,
                OrderStatus::Paid->value,
            ]),
        };

        $orders = $query->paginate(20);

        return response()->json([
            'data' => collect($orders->items())->map(fn (Order $order) => $this->summary($order)),
            'meta' => [
                'segment' => $segment,
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(Request $request, string $orderNumber): JsonResponse
    {
        $seller = $this->seller($request);

        $order = Order::query()
            ->where('seller_id', $seller->id)
            ->with(['items', 'payments', 'delivery', 'shippingAddress', 'dispute.messages'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        return response()->json([
            'data' => [
                ...$this->summary($order),
                'detail' => $this->breakdown($order),
                'delivery' => $order->delivery ? [
                    'status' => $order->delivery->status,
                    'tracking_number' => $order->tracking_number,
                    'assigned_at' => $order->delivery->assigned_at?->toIso8601String(),
                    'estimate' => $order->delivery->estimated_delivery?->toIso8601String(),
                    'courier' => $order->delivery->courier ? [
                        'name' => $order->delivery->courier->user?->name,
                        'phone' => $order->delivery->courier->user?->phone,
                        'transport' => $order->delivery->courier->transport_type,
                    ] : null,
                ] : null,
                'address' => $order->shippingAddress ? [
                    'recipient' => trim(($order->shippingAddress->first_name ?? '').' '.($order->shippingAddress->last_name ?? '')),
                    'address_line1' => $order->shippingAddress->address_line1,
                    'address_line2' => $order->shippingAddress->address_line2,
                    'city' => $order->shippingAddress->city,
                    'state_province' => $order->shippingAddress->state_province,
                    'phone' => $order->shippingAddress->phone,
                ] : null,
                'dispute' => $order->dispute ? [
                    'id' => $order->dispute->id,
                    'status' => $order->dispute->status,
                    'title' => $order->dispute->title,
                    'photo' => $order->dispute->photo_path,
                    'voice' => $order->dispute->voice_path,
                    'messages_count' => $order->dispute->messages->count(),
                ] : null,
            ],
        ]);
    }

    public function accept(Request $request, string $orderNumber): JsonResponse
    {
        $order = $this->orderFor($request, $orderNumber);

        try {
            $order = $this->orders->accept($order);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['order' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Commande acceptée.', 'order' => $this->summary($order)]);
    }

    public function refuse(Request $request, string $orderNumber): JsonResponse
    {
        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:190']]);
        $order = $this->orderFor($request, $orderNumber);

        try {
            $order = $this->orders->refuseBySeller($order, $validated['reason'] ?? 'Refusée par le vendeur.');
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['order' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Commande refusée.', 'order' => $this->summary($order)]);
    }

    public function ship(Request $request, string $orderNumber): JsonResponse
    {
        $validated = $request->validate(['tracking' => ['nullable', 'string', 'max:190']]);
        $order = $this->orderFor($request, $orderNumber);

        try {
            $order = $this->orders->ship($order, $validated['tracking'] ?? null);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['order' => [$e->getMessage()]]);
        }

        $courier = $order->delivery?->courier;

        return response()->json([
            'message' => 'Commande expédiée.',
            'tracking_number' => $order->tracking_number,
            'courier_assigned' => $courier ? $courier->user?->name : false,
            'order' => $this->summary($order),
        ]);
    }

    public function delivered(Request $request, string $orderNumber): JsonResponse
    {
        $request->validate([
            'delivery_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $order = $this->orderFor($request, $orderNumber);

        try {
            $order = $this->orders->markDelivered($order, null, $request->input('delivery_notes'));
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['order' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Livraison confirmée. Merci !', 'order' => $this->summary($order)]);
    }

    private function summary(Order $order): array
    {
        $commission = (int) Commission::query()->where('order_id', $order->id)->sum('amount_minor');

        return [
            'order_number' => $order->order_number,
            'status' => $order->status,
            'status_label' => $this->label($order->status),
            'status_color' => $this->color($order->status),
            'payment_status' => $order->payment_status,
            'placed_at' => $order->placed_at?->toIso8601String(),
            'buyer' => [
                'name' => $order->user?->name,
                'phone' => $order->user?->phone,
            ],
            'items' => $order->items->map(function ($item) {
                $snapshot = $item->product_snapshot ?? [];

                return [
                    'id' => $item->id,
                    'name' => $snapshot['name'] ?? $item->product?->name,
                    'image' => $snapshot['image'] ?? null,
                    'quantity' => (int) $item->quantity,
                    'total' => (int) $item->total_minor,
                ];
            })->values(),
            'subtotal' => (int) $order->subtotal_minor,
            'shipping' => (int) $order->shipping_rate_minor,
            'total' => (int) $order->total_minor,
            'commission' => $commission,
            'disputed' => $order->dispute !== null,
        ];
    }

    private function breakdown(Order $order): array
    {
        $sale = (int) $order->subtotal_minor;
        $shipping = (int) $order->shipping_rate_minor;
        $commission = (int) Commission::query()->where('order_id', $order->id)->sum('amount_minor');
        $paymentFee = (int) ($order->payments->sum('fee_minor'));

        return [
            'sale_price' => $sale,
            'shipping' => $shipping,
            'platform_commission' => $commission,
            'payment_fee' => $paymentFee,
            'net_received' => max(0, $sale - $commission - $paymentFee),
            'currency' => $order->currency,
        ];
    }

    private function orderFor(Request $request, string $orderNumber): Order
    {
        $seller = $this->seller($request);

        return Order::query()
            ->where('seller_id', $seller->id)
            ->with(['items', 'delivery', 'payments', 'user'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();
    }

    private function seller(Request $request)
    {
        $seller = $request->user()->seller;

        if ($seller === null) {
            abort(403, 'Profil Vendeur requis.');
        }

        return $seller;
    }

    private function label(string $status): string
    {
        try {
            return OrderStatus::from($status)->label();
        } catch (\ValueError) {
            return $status;
        }
    }

    private function color(string $status): string
    {
        return match ($status) {
            OrderStatus::Delivered->value => 'green',
            OrderStatus::Preparation->value, OrderStatus::Shipped->value, OrderStatus::InDelivery->value => 'orange',
            default => 'red',
        };
    }
}