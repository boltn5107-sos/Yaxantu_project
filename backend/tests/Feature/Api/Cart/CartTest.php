<?php

namespace Tests\Feature\Api\Cart;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CartTest extends TestCase
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

    private function activeProduct(int $stock = 10, bool $verifiedSeller = true): Product
    {
        $sellerUser = User::factory()->create();
        $sellerUser->assignRole(Role::Seller);

        $seller = Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'active',
            'verification_level' => $verifiedSeller ? 2 : 0,
            'verified_at' => $verifiedSeller ? now() : null,
        ]);

        $category = Category::where('slug', 'electronique')->first();

        return Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => 'Écouteurs Sans Fil',
            'price_minor' => 9500,
            'stock_quantity' => $stock,
            'requires_shipping' => true,
        ]);
    }

    public function test_cart_requires_authentication(): void
    {
        $this->getJson('/api/v1/cart')->assertUnauthorized();
    }

    public function test_index_returns_empty_cart(): void
    {
        $user = $this->buyer();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/cart');

        $response
            ->assertOk()
            ->assertJsonPath('data.items', [])
            ->assertJsonPath('data.count', 0)
            ->assertJsonPath('data.total', 0);
    }

    public function test_add_product_to_cart(): void
    {
        $user = $this->buyer();
        $product = $this->activeProduct();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', [
                'product_id' => $product->id,
                'quantity' => 2,
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.count', 2)
            ->assertJsonPath('data.subtotal', 19000)
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.unit_price', 9500);
    }

    public function test_add_enforces_available_stock(): void
    {
        $user = $this->buyer();
        $product = $this->activeProduct(stock: 5);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', [
                'product_id' => $product->id,
                'quantity' => 6,
            ])
            ->assertUnprocessable();

        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_add_inactive_product_is_rejected(): void
    {
        $user = $this->buyer();
        $product = $this->activeProduct();
        $product->update(['is_active' => false]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id])
            ->assertNotFound();
    }

    public function test_update_quantity_recalculates_totals(): void
    {
        $user = $this->buyer();
        $product = $this->activeProduct();

        $add = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $itemId = $add->json('data.items.0.id');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/v1/cart/items/{$itemId}", ['quantity' => 3])
            ->assertOk()
            ->assertJsonPath('data.items.0.quantity', 3)
            ->assertJsonPath('data.subtotal', 28500);
    }

    public function test_remove_item_from_cart(): void
    {
        $user = $this->buyer();
        $product = $this->activeProduct();

        $add = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id]);

        $itemId = $add->json('data.items.0.id');

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/cart/items/{$itemId}")
            ->assertOk()
            ->assertJsonPath('data.count', 0);

        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_clear_cart_removes_all_items(): void
    {
        $user = $this->buyer();
        $product = $this->activeProduct();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 2]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/cart')
            ->assertOk();

        $this->assertDatabaseCount('cart_items', 0);
    }

    public function test_user_cannot_modify_another_users_cart_item(): void
    {
        $userA = $this->buyer();
        $userB = $this->buyer();
        $product = $this->activeProduct();

        $add = $this->actingAs($userA, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id]);

        $itemId = $add->json('data.items.0.id');

        $this->actingAs($userB, 'sanctum')
            ->patchJson("/api/v1/cart/items/{$itemId}", ['quantity' => 9])
            ->assertForbidden();
    }
}