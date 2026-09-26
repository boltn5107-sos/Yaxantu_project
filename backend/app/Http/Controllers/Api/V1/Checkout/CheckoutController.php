<?php

namespace App\Http\Controllers\Api\V1\Checkout;

use App\Http\Controllers\Api\V1\Controller;
use App\Http\Requests\Api\V1\Checkout\CheckoutRequest;
use App\Http\Resources\OrderResource;
use App\Services\CartService;
use App\Services\ConfigService;
use App\Services\DeliveryFareService;
use App\Services\OrderService;
use App\Services\PaymentManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CartService $cart,
        private readonly OrderService $orders,
        private readonly ConfigService $config,
        private readonly PaymentManager $payments,
        private readonly DeliveryFareService $fares,
    ) {}

    /**
     * Estimation des frais de livraison « à la Yango » (distance boutique →
     * adresse) pour l'adresse courante. Aucune donnée n'est persistée.
     */
    public function estimate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shipping_address_id' => ['nullable', 'integer', 'exists:addresses,id'],
            'address' => ['nullable', 'array'],
            'address.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'address.longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $cart = $this->cart->resolve(session()->getId());

        if ($cart === null || $cart->items->isEmpty()) {
            return response()->json(['message' => 'Votre panier est vide.'], 422);
        }

        $address = $this->orders->estimateAddressFor(
            $request->user(),
            $data['address'] ?? [],
            $data['shipping_address_id'] ?? null,
        );

        if ($address === null || ! $this->fares->hasCoordinates($address)) {
            // Sans position du client, aucun tarif réel ne peut être estimé :
            // on renvoie null plutôt qu'un forfait de repli qui n'a pas
            // vocation à être affiché comme prix du client.
            return response()->json(['data' => [
                'shipping_total' => null,
                'free_threshold' => $this->config->deliveryFreeThresholdMinor(),
                'sellers' => [],
            ]]);
        }

        $rows = $this->fares->sellersForItems($cart->items, $address);

        // Une boutique du panier sans position ne permet pas de tarifer son
        // trajet : l'estimation ne présente aucun montant (le checkout refusera
        // en nommant la boutique concernée).
        foreach ($rows as $row) {
            if ($row['shipping'] === null) {
                return response()->json(['data' => [
                    'shipping_total' => null,
                    'free_threshold' => $this->config->deliveryFreeThresholdMinor(),
                    'sellers' => [],
                ]]);
            }
        }

        return response()->json(['data' => [
            'shipping_total' => (int) array_sum(array_column($rows, 'shipping')),
            'free_threshold' => $this->config->deliveryFreeThresholdMinor(),
            'sellers' => $rows,
        ]]);
    }

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

        $paymentMethod = $data['payment_method'] ?? 'cod';

        $available = array_column($this->payments->methods(), 'id');
        if (! in_array($paymentMethod, $available, true)) {
            return response()->json(['message' => 'Ce moyen de paiement est indisponible.'], 422);
        }

        $paymentOptions = [
            'phone' => $data['mobile_money_phone'] ?? null,
            'provider' => $data['mobile_money_provider'] ?? 'momo',
        ];

        try {
            $result = $this->orders->checkout(
                $request->user(),
                $cart,
                $addressData,
                $paymentMethod,
                $paymentOptions,
                (bool) ($data['shipping_approved'] ?? false),
                $data['promo_code'] ?? null,
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