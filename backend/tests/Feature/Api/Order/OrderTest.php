<?php

namespace Tests\Feature\Api\Order;

use App\Enums\Role;
use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
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

        return Seller::factory()->create(['user_id' => $user->id, 'status' => 'active']);
    }

    private function placeOrder(User $user, Seller $seller, string $name = 'Article', int $price = 5000): Order
    {
        $category = Category::where('slug', 'electronique')->first();

        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => $name,
            'price_minor' => $price,
            'stock_quantity' => 10,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Douala', 'latitude' => 4.0511, 'longitude' => 9.7679],
                'payment_method' => 'cod',
                'shipping_approved' => true,
            ]);

        $response->assertCreated();

        return Order::query()
            ->where('user_id', $user->id)
            ->latest()
            ->firstOrFail();
    }

    public function test_index_lists_only_own_orders(): void
    {
        $userA = $this->buyer();
        $userB = $this->buyer();
        $seller = $this->seller();

        $this->placeOrder($userA, $seller, 'Article A');
        $this->placeOrder($userB, $seller, 'Article B');

        $this->actingAs($userA, 'sanctum')
            ->getJson('/api/v1/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_id', null)
            ->assertJsonStructure(['data' => [['order_number', 'status', 'total', 'items']]]);
    }

    public function test_show_returns_order_detail(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $order = $this->placeOrder($user, $seller);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/orders/'.$order->order_number)
            ->assertOk()
            ->assertJsonPath('data.order_number', $order->order_number)
            ->assertJsonPath('data.status_label', 'Paiement en attente')
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.name', 'Article')
            ->assertJsonPath('data.total', 6000)
            ->assertJsonStructure(['data' => ['address', 'payment', 'delivery']]);
    }

    public function test_show_forbids_other_users_order(): void
    {
        $userA = $this->buyer();
        $userB = $this->buyer();
        $seller = $this->seller();
        $order = $this->placeOrder($userA, $seller);

        $this->actingAs($userB, 'sanctum')
            ->getJson('/api/v1/orders/'.$order->order_number)
            ->assertNotFound();
    }

    public function test_cancel_restores_stock(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $order = $this->placeOrder($user, $seller);

        $productId = Product::query()->where('seller_id', $seller->id)->first()?->id;
        $this->assertDatabaseHas('products', ['id' => $productId, 'stock_quantity' => 9]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/orders/'.$order->order_number.'/cancel', ['reason' => 'Changement d\'avis'])
            ->assertOk()
            ->assertJsonPath('data.status', OrderStatus::Cancelled->value);

        $this->assertDatabaseHas('products', ['id' => $productId, 'stock_quantity' => 10]);
        $this->assertDatabaseHas('orders', [
            'order_number' => $order->order_number,
            'status' => OrderStatus::Cancelled->value,
            'payment_status' => 'cancelled',
        ]);
    }
}