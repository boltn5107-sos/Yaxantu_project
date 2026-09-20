<?php

namespace Tests\Feature\Api\Favorite;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteTest extends TestCase
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

    private function product(): Product
    {
        $sellerUser = User::factory()->create();
        $sellerUser->assignRole(Role::Seller);

        $seller = Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'active',
        ]);

        $category = Category::where('slug', 'electronique')->first();

        return Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => 'Produit Favori',
            'stock_quantity' => 10,
        ]);
    }

    public function test_favorites_require_authentication(): void
    {
        $this->getJson('/api/v1/favorites')->assertUnauthorized();
    }

    public function test_add_and_list_favorites(): void
    {
        $user = $this->buyer();
        $product = $this->product();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/favorites/'.$product->id)
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/favorites/'.$product->id)
            ->assertOk();

        $this->assertDatabaseCount('favorites', 1);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/favorites')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Produit Favori');
    }

    public function test_remove_favorite(): void
    {
        $user = $this->buyer();
        $product = $this->product();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/favorites/'.$product->id);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/favorites/'.$product->id)
            ->assertOk();

        $this->assertDatabaseCount('favorites', 0);
    }
}