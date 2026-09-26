<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Str;

/**
 * Gestion du panier, connecté (user) ou invité (session).
 *
 * Les totaux sont toujours recalculés côté serveur à partir des produits :
 * le client ne transmet jamais de prix (cahier des charges §13, §30).
 */
class CartService
{
    public function __construct(
        private readonly ConfigService $config,
    ) {}

    public function resolve(?string $sessionId = null): ?Cart
    {
        $user = auth()->user();

        if ($user !== null) {
            return $this->resolveUserCart($user->getKey());
        }

        if ($sessionId !== null && $sessionId !== '') {
            return $this->resolveGuestCart($sessionId);
        }

        return null;
    }

    private function resolveUserCart(int $userId): ?Cart
    {
        $cart = Cart::query()
            ->with('items.product')
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->latest()
            ->first();

        if ($cart === null) {
            $cart = Cart::create([
                'user_id' => $userId,
                'status' => 'active',
                'currency' => $this->config->currency(),
            ]);
        }

        // Fusion d'un panier invité préexistant dans la même session.
        $guestCart = Cart::query()
            ->where('session_id', request()->session()->getId())
            ->where('user_id', null)
            ->where('status', 'active')
            ->where('id', '!=', $cart->id)
            ->first();

        if ($guestCart !== null) {
            foreach ($guestCart->items as $item) {
                $this->addExisting($cart, $item->product_id, $item->quantity);

                if ($item->product_snapshot !== null) {
                    $cart->items()->create([
                        'product_id' => $item->product_id,
                        'product_variant_id' => $item->product_variant_id,
                        'product_snapshot' => $item->product_snapshot,
                        'variant_snapshot' => $item->variant_snapshot,
                        'quantity' => $item->quantity,
                        'unit_price_minor' => $item->unit_price_minor,
                        'unit_price_currency' => $item->unit_price_currency,
                        'total_minor' => $item->quantity * $item->unit_price_minor,
                        'requires_shipping' => $item->requires_shipping,
                        'seller_id' => $item->seller_id,
                    ]);
                }
            }

            $guestCart->delete();
            $cart->unsetRelation('items');
        }

        $this->refresh($cart);

        return $cart;
    }

    private function resolveGuestCart(string $sessionId): ?Cart
    {
        $cart = Cart::query()
            ->with('items.product')
            ->where('session_id', $sessionId)
            ->where('user_id', null)
            ->where('status', 'active')
            ->latest()
            ->first();

        if ($cart === null) {
            $cart = Cart::create([
                'session_id' => $sessionId,
                'status' => 'active',
                'currency' => $this->config->currency(),
                'expires_at' => now()->addMinutes($this->config->int('cart.expiration_minutes', 60)),
            ]);
        }

        $this->refresh($cart);

        return $cart;
    }

    /**
     * Ajoute un produit au panier (avec vérification du stock disponible).
     */
    public function add(Product $product, int $quantity = 1, ?ProductVariant $variant = null, ?int $sellerId = null): Cart
    {
        $quantity = max(1, $quantity);
        $cart = $this->resolve(session()->getId());

        $existing = $cart->items()
            ->where('product_id', $product->id)
            ->where('product_variant_id', $variant?->getKey())
            ->first();

        $newQuantity = ($existing?->quantity ?? 0) + $quantity;

        $this->assertStock($product, $newQuantity);

        $snapshot = [
            'name' => $product->name,
            'slug' => $product->slug,
            'sku' => $product->sku,
            'image' => $product->images()->where('is_primary', true)->value('path')
                ?? $product->images()->value('path'),
            'seller' => $product->seller?->shop_name,
            'seller_slug' => $product->seller?->slug,
        ];

        if ($existing !== null) {
            $existing->update([
                'quantity' => $newQuantity,
                'total_minor' => $newQuantity * $existing->unit_price_minor,
            ]);

            return $cart;
        }

        $cart->items()->create([
            'product_id' => $product->id,
            'product_variant_id' => $variant?->getKey(),
            'seller_id' => $sellerId ?? $product->seller_id,
            'product_snapshot' => $snapshot,
            'variant_snapshot' => $variant ? ['name' => $variant->name, 'sku' => $variant->sku] : null,
            'quantity' => $quantity,
            'unit_price_minor' => (int) $product->price_minor,
            'unit_price_currency' => $product->price_currency ?: $this->config->currency(),
            'total_minor' => $quantity * (int) $product->price_minor,
            'requires_shipping' => $product->requires_shipping,
            'weight' => $product->weight,
        ]);

        $this->refresh($cart);

        return $cart;
    }

    public function updateQuantity(CartItem $item, int $quantity): Cart
    {
        $quantity = max(1, $quantity);
        $product = $item->product;

        if ($product === null) {
            $item->delete();

            return $this->resolve(session()->getId());
        }

        $this->assertStock($product, $quantity);

        $item->update([
            'quantity' => $quantity,
            'total_minor' => $quantity * $item->unit_price_minor,
        ]);

        return $this->refresh($item->cart);
    }

    public function remove(CartItem $item): Cart
    {
        $cart = $item->cart;
        $item->delete();

        return $this->refresh($cart);
    }

    public function clear(?Cart $cart): void
    {
        $cart?->items()->delete();
    }

    /**
     * Recalcule les totaux du panier depuis les articles.
     *
     * Les frais de livraison ne sont volontairement pas calculés ici : ils
     * dépendent de la position du client et sont estimés au checkout
     * (DeliveryFareService) en fonction de la distance boutique → adresse.
     */
    public function refresh(Cart $cart): Cart
    {
        $cart->load('items');
        $cart->forceFill([
            'total_minor' => $cart->items->sum(fn ($item) => $item->total_minor),
        ])->save();

        return $cart;
    }

    private function addExisting(Cart $cart, int $productId, int $quantity): void
    {
        $product = Product::query()->find($productId);

        if ($product === null) {
            return;
        }

        $existing = $cart->items()->where('product_id', $productId)->first();
        $newQuantity = ($existing?->quantity ?? 0) + $quantity;

        if ($newQuantity > $product->stock_quantity) {
            return;
        }

        if ($existing !== null) {
            $existing->update([
                'quantity' => $newQuantity,
                'total_minor' => $newQuantity * $existing->unit_price_minor,
            ]);
        }
    }

    private function assertStock(Product $product, int $quantity): void
    {
        if (! $product->is_active || $product->visibility !== 'public') {
            throw new \RuntimeException('Ce produit n\'est pas disponible.');
        }

        if ($quantity > $product->stock_quantity) {
            throw new \RuntimeException(sprintf(
                'Stock insuffisant. Seuls %d exemplaire(s) disponible(s).',
                $product->stock_quantity,
            ));
        }
    }

    public static function newSessionId(): string
    {
        return Str::uuid()->toString();
    }
}