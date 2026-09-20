<?php

namespace Tests\Feature\Api\Review;

use App\Enums\ReviewStatus;
use App\Enums\Role;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
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

    private function product(Seller $seller): Product
    {
        $category = Category::where('slug', 'electronique')->first();

        return Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => 'Produit à Aviser',
            'stock_quantity' => 10,
        ]);
    }

    public function test_index_returns_only_approved_reviews(): void
    {
        $seller = $this->seller();
        $product = $this->product($seller);

        Review::factory()->create([
            'product_id' => $product->id,
            'user_id' => $this->buyer()->id,
            'rating' => 5,
            'status' => ReviewStatus::Approved->value,
            'is_approved' => true,
        ]);
        Review::factory()->create([
            'product_id' => $product->id,
            'user_id' => $this->buyer()->id,
            'rating' => 1,
            'status' => ReviewStatus::Pending->value,
            'is_approved' => false,
        ]);

        $this->getJson('/api/v1/products/'.$product->slug.'/reviews')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.rating', 5);
    }

    public function test_store_creates_pending_review(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/products/'.$product->slug.'/reviews', [
                'rating' => 4,
                'title' => 'Très bon',
                'content' => 'Le produit correspond à la description.',
            ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.is_verified_purchase', false)
            ->assertJsonPath('data.rating', 4);

        $this->assertDatabaseHas('reviews', [
            'product_id' => $product->id,
            'user_id' => $user->id,
            'status' => ReviewStatus::Pending->value,
        ]);
    }

    public function test_store_flags_verified_purchase_after_order(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Douala'],
                'payment_method' => 'cod',
                'shipping_approved' => true,
            ])
            ->assertCreated();

        Order::query()->where('user_id', $user->id)->latest()->first()?->update(['status' => 'paid']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/products/'.$product->slug.'/reviews', ['rating' => 5])
            ->assertOk()
            ->assertJsonPath('data.is_verified_purchase', true);
    }

    public function test_store_requires_authentication(): void
    {
        $seller = $this->seller();
        $product = $this->product($seller);

        $this->postJson('/api/v1/products/'.$product->slug.'/reviews', ['rating' => 5])
            ->assertUnauthorized();
    }

    public function test_store_validates_rating(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/products/'.$product->slug.'/reviews', ['rating' => 9])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rating']);
    }
}