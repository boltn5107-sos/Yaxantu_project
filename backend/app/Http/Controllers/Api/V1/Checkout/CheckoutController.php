<?php

namespace App\Http\Controllers\Api\V1\Checkout;

use App\Http\Controllers\Api\V1\Controller;
use App\Http\Requests\Api\V1\Checkout\CheckoutRequest;
use App\Http\Resources\OrderResource;
use App\Services\CartService;
use App\Services\ConfigService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CartService $cart,
        private readonly OrderService $orders,
        private readonly ConfigService $config,
    ) {}

    /**
     * Transfère le panier en commande(s) et initie le paiement.
     * Le montant est toujours recalculé côté serveur.
     */
    public function store(CheckoutRequest $request): JsonResponse
    {
        $data = $request->validated();

        $cart = $this->cart->resolve(session()->getId());

        if ($cart === null || $cart->items->isEmpty()) {
            return response()->json(['message' => 'Votre panier est vide.'], 422);
        }

        $addressData = $data['address'] ?? [];
        $addressData['id'] = $data['shipping_address_id'] ?? null;

        $paymentOptions = [
            'phone' => $data['mobile_money_phone'] ?? null,
            'provider' => $data['mobile_money_provider'] ?? 'momo',
        ];

        try {
            $result = $this->orders->checkout(
                $request->user(),
                $cart,
                $addressData,
                $data['payment_method'] ?? 'cod',
                $paymentOptions,
                (bool) ($data['shipping_approved'] ?? false),
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Commande enregistrée.',
            'data' => OrderResource::collection($result['orders']),
            'payments' => collect($result['payments'])->map(fn ($payment) => [
                'id' => $payment->id,
                'order_id' => $payment->order_id,
                'transaction_id' => $payment->transaction_id,
                'method' => $payment->method,
                'status' => $payment->status,
            ]),
        ], 201);
    }
}