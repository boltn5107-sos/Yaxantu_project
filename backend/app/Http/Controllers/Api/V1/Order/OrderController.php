<?php

namespace App\Http\Controllers\Api\V1\Order;

use App\Enums\OrderStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use RuntimeException;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orders,
    ) {}

    /**
     * Commandes de l'utilisateur courant (permission orders.view_own).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->query('status');

        $query = $request->user()->orders()
            ->with(['items', 'payments'])
            ->orderByDesc('placed_at');

        if (is_string($status) && $status !== '') {
            $query->where('status', $status);
        }

        return OrderResource::collection($query->paginate(10)->withQueryString());
    }

    /**
     * Détail d'une commande.
     */
    public function show(Request $request, string $orderNumber): JsonResource
    {
        $order = $request->user()->orders()
            ->with(['items', 'payments', 'delivery', 'shippingAddress'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        return new OrderResource($order);
    }

    /**
     * Annulation autorisée tant que la commande n'est ni livrée ni annulée.
     */
    public function cancel(Request $request, string $orderNumber): JsonResource
    {
        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $order = $request->user()->orders()
            ->with('items')
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        try {
            $order = $this->orders->cancel($order, $validated['reason'] ?? 'Annulé par l\'acheteur.');
        } catch (RuntimeException $e) {
            abort(422, $e->getMessage());
        }

        return (new OrderResource($order->load('items')))
            ->additional(['message' => 'Commande annulée.']);
    }
}