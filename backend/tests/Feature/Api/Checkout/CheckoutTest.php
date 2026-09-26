<?php

namespace Tests\Feature\Api\Checkout;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
    }

    private function buyer(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Buyer);

        return $user;
    }

    private function seller(): Seller
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);
    }

    private function product(Seller $seller, string $name, int $price, int $stock = 20): Product
    {
        $category = Category::where('slug', 'electronique')->first();

        return Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => $name,
            'price_minor' => $price,
            'stock_quantity' => $stock,
        ]);
    }

    private function addressPayload(array $overrides = []): array
    {
        return array_merge([
            'address' => [
                'first_name' => 'Awa',
                'last_name' => 'Diallo',
                'address_line1' => 'Rue Principale 12',
                'city' => 'Douala',
                'state_province' => 'Littoral',
                'country_code' => 'CM',
                'phone' => '691234567',
                'latitude' => 4.0511,
                'longitude' => 9.7679,
            ],
            'payment_method' => 'cod',
        ], $overrides);
    }

    public function test_checkout_requires_authentication(): void
    {
        $this->postJson('/api/v1/checkout', $this->addressPayload())
            ->assertUnauthorized();
    }

    public function test_checkout_with_empty_cart_is_rejected(): void
    {
        $user = $this->buyer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload())
            ->assertStatus(422);
    }

    public function test_checkout_creates_order_and_payment(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Smartphone', 45000, stock: 5);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 2]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload([
                'payment_method' => 'mobile_money',
                'mobile_money_phone' => '691234567',
            ]));

        $response
            ->assertCreated()
            ->assertJsonPath('data.0.status', 'payment_pending')
            ->assertJsonPath('data.0.subtotal', 90000)
            ->assertJsonPath('data.0.total', 90000)
            ->assertJsonPath('data.0.items.0.name', 'Smartphone')
            ->assertJsonPath('data.0.address.city', 'Douala')
            ->assertJsonPath('payments.0.method', 'mobile_money');

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'total_minor' => 90000,
            'payment_status' => 'pending',
        ]);

        $this->assertDatabaseHas('payments', ['method' => 'mobile_money']);
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseCount('cart_items', 0);

        // Le stock a été décrémenté.
        $this->assertDatabaseHas('products', ['id' => $product->id, 'stock_quantity' => 3]);
    }

    public function test_checkout_sets_shipping_free_above_threshold(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Basse', 30000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload());

        $response->assertCreated();
        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'total_minor' => 30000,
            'shipping_rate_minor' => 0,
        ]);
    }

    public function test_checkout_splits_orders_by_seller(): void
    {
        $user = $this->buyer();
        $sellerA = $this->seller();
        $sellerB = $this->seller();
        $productA = $this->product($sellerA, 'Produit A', 1000);
        $productB = $this->product($sellerB, 'Produit B', 2000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $productA->id]);
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $productB->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload(['shipping_approved' => true]));

        $response->assertCreated();

        $this->assertDatabaseCount('orders', 2);
        $this->assertDatabaseHas('orders', ['seller_id' => $sellerA->id]);
        $this->assertDatabaseHas('orders', ['seller_id' => $sellerB->id]);
    }

    public function test_checkout_rejects_incomplete_address(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Produit', 1000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['first_name' => 'Awa'],
                'payment_method' => 'cod',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['address.address_line1', 'address.city']);
    }

    public function test_checkout_charges_shipping_fees_by_default(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Colis Standard', 1000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload(['shipping_approved' => true]));

        // La boutique de test est à Douala comme l'adresse du client :
        // distance 0 → prise en charge de base (1000), aucune case requis.
        $response->assertCreated();
        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'subtotal_minor' => 1000,
            'shipping_rate_minor' => 1000,
            'total_minor' => 2000,
        ]);
    }

    public function test_checkout_requires_shipping_approval_when_shipping_is_charged(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Colis', 1000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Vous devez accepter les frais de livraison de 1000 FCFA qui s\'ajoutent à votre total avant de confirmer la commande.');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_free_shipping_does_not_require_approval(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Gros Colis', 30000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        // Au-delà du seuil, la livraison est offerte : aucune case requise.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload())
            ->assertCreated();

        $this->assertDatabaseHas('orders', ['shipping_rate_minor' => 0, 'total_minor' => 30000]);
    }

    public function test_checkout_refuses_when_seller_has_no_position(): void
    {
        $user = $this->buyer();
        $seller = Seller::factory()->create([
            'user_id' => User::factory()->create()->id,
            'status' => 'active',
            'location_lat' => null,
            'location_lng' => null,
        ]);
        User::query()->whereKey($seller->user_id)->first()?->assignRole(Role::Seller);
        $product = $this->product($seller, 'Colis Sans Position', 1000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload(['shipping_approved' => true]))
            ->assertStatus(422)
            ->assertJsonPath('message', 'La boutique « '.$seller->shop_name.' » doit définir sa position pour calculer les frais de livraison.');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_creates_commissions_for_seller(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Produit Commission', 10000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', $this->addressPayload(['shipping_approved' => true]));

        $this->assertDatabaseHas('commissions', [
            'seller_id' => $seller->id,
            'amount_minor' => 100,
            'rate_bps' => 100,
            'status' => 'pending',
        ]);
    }

    public function test_estimate_returns_routed_fee_for_priciable_shop(): void
    {
        $user = $this->buyer();

        // Boutique de test : position par défaut (Douala) → distance 0.
        $seller = $this->seller();
        $product = $this->product($seller, 'Colis Estimé', 1000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout/estimate', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Douala', 'latitude' => 4.0511, 'longitude' => 9.7679],
            ])
            ->assertOk()
            ->assertJsonPath('data.shipping_total', 1000)
            ->assertJsonPath('data.sellers.0.shipping', 1000)
            ->assertJsonPath('data.sellers.0.shipping_free', false);
    }

    public function test_estimate_returns_null_for_shop_without_position(): void
    {
        $user = $this->buyer();
        $seller = Seller::factory()->create([
            'user_id' => User::factory()->create()->id,
            'status' => 'active',
            'location_lat' => null,
            'location_lng' => null,
        ]);
        User::query()->whereKey($seller->user_id)->first()?->assignRole(Role::Seller);
        $product = $this->product($seller, 'Colis Sans Position', 1000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout/estimate', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Douala', 'latitude' => 4.0511, 'longitude' => 9.7679],
            ])
            ->assertOk()
            ->assertJsonPath('data.shipping_total', null);
    }
}