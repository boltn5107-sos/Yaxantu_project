<?php

namespace App\Http\Controllers\Api\V1\Cart;

use App\Http\Controllers\Api\V1\Controller;
use App\Http\Requests\Api\V1\Cart\AddToCartRequest;
use App\Http\Requests\Api\V1\Cart\UpdateCartItemRequest;
use App\Http\Resources\CartResource;
use App\Models\CartItem;
use App\Models\Product;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

class CartController extends Controller
{
    public function __construct(
        private readonly CartService $cart,
    ) {}

    /**
     * Panier courant de l'utilisateur.
     */
    public function index(): JsonResponse
    {
        return (new CartResource($this->cart->resolve(session()->getId())))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Ajout d'un produit au panier.
     */
    public function add(AddToCartRequest $request): JsonResponse
    {
        $data = $request->validated();

        $product = Product::query()
            ->whereKey($data['product_id'])
            ->where('is_active', true)
            ->where('visibility', 'public')
            ->whereHas('seller', fn ($q) => $q->where('status', 'active'))
            ->firstOrFail();

        try {
            $cart = $this->cart->add(
                $product,
                (int) ($data['quantity'] ?? 1),
            );
        } catch (\RuntimeException $e) {
            abort(422, $e->getMessage());
        }

        return (new CartResource($cart))
            ->additional(['message' => 'Produit ajouté au panier.'])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Modification de la quantité d'un article.
     */
    public function update(UpdateCartItemRequest $request, CartItem $item): JsonResponse
    {
        $this->authorizeCartItem($item);

        try {
            $cart = $this->cart->updateQuantity($item, (int) $request->validated('quantity'));
        } catch (\RuntimeException $e) {
            abort(422, $e->getMessage());
        }

        return (new CartResource($cart))->response()->setStatusCode(200);
    }

    /**
     * Suppression d'un article du panier.
     */
    public function remove(CartItem $item): JsonResponse
    {
        $this->authorizeCartItem($item);

        $cart = $this->cart->remove($item);

        return (new CartResource($cart))->response()->setStatusCode(200);
    }

    /**
     * Vidage complet du panier.
     */
    public function clear(): JsonResponse
    {
        $this->cart->clear($this->cart->resolve(session()->getId()));

        return response()->json(['message' => 'Panier vidé.']);
    }

    private function authorizeCartItem(CartItem $item): void
    {
        $cart = $item->cart;

        if ($cart->user_id !== auth()->id()) {
            abort(403, 'Cet article ne fait pas partie de votre panier.');
        }
    }
}