<?php

namespace Tests\Feature\Api;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([RoleSeeder::class, CategorySeeder::class]);
    }

    private function activeSeller(bool $verified = false): Seller
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
            'verification_level' => $verified ? 2 : 0,
            'verified_at' => $verified ? now() : null,
        ]);
    }

    public function test_index_returns_only_active_public_products(): void
    {
        $seller = $this->activeSeller();

        Product::factory()->create(['seller_id' => $seller->id, 'name' => 'Produit Visible']);
        Product::factory()->inactive()->create(['seller_id' => $seller->id, 'name' => 'Produit Caché']);

        $this->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Produit Visible');
    }

    public function test_index_search_filter_and_pagination(): void
    {
        $seller = $this->activeSeller();

        Product::factory()->create([
            'seller_id' => $seller->id,
            'name' => 'Téléphone Samsung Galaxy',
            'price_minor' => 130000,
        ]);
        Product::factory()->create([
            'seller_id' => $seller->id,
            'name' => 'Robe en coton',
            'price_minor' => 15000,
        ]);

        $this->getJson('/api/v1/products?q=Samsung')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Téléphone Samsung Galaxy');

        $this->getJson('/api/v1/products?min_price=20000&sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Téléphone Samsung Galaxy');

        $this->getJson('/api/v1/products?max_price=16000&sort=price_desc')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Robe en coton');
    }

    public function test_index_filters_by_category_and_verified_seller(): void
    {
        $category = Category::where('slug', 'electronique')->first();
        $verified = $this->activeSeller(true);
        $notVerified = $this->activeSeller(false);

        Product::factory()->create([
            'seller_id' => $verified->id,
            'category_id' => $category->id,
            'name' => 'Casque',
        ]);
        Product::factory()->create([
            'seller_id' => $notVerified->id,
            'category_id' => $category->id,
            'name' => 'Chargeur',
        ]);

        $this->getJson('/api/v1/products?category=electronique')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/products?category=electronique&verified=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Casque');
    }

    public function test_index_featured_products(): void
    {
        $seller = $this->activeSeller();

        Product::factory()->featured()->create(['seller_id' => $seller->id, 'name' => 'Mis en avant']);
        Product::factory()->create(['seller_id' => $seller->id, 'name' => 'Standard']);

        $this->getJson('/api/v1/products?featured=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Mis en avant');
    }

    public function test_show_returns_product_detail_with_images(): void
    {
        $seller = $this->activeSeller(true);

        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'name' => 'Autoradio Bluetooth',
            'price_minor' => 32000,
        ]);

        $product->images()->create([
            'path' => '/images/products/test.jpg',
            'alt_text' => 'Autoradio',
            'is_primary' => true,
            'sort_order' => 1,
        ]);

        $this->getJson('/api/v1/products/autoradio-bluetooth')
            ->assertOk()
            ->assertJsonPath('data.name', 'Autoradio Bluetooth')
            ->assertJsonPath('data.price', 32000)
            ->assertJsonPath('data.seller.verified', true)
            ->assertJsonCount(1, 'data.images')
            ->assertJsonPath('data.thumbnail', '/images/products/test.jpg');
    }

    public function test_show_hides_inactive_product(): void
    {
        $seller = $this->activeSeller();
        Product::factory()->inactive()->create(['seller_id' => $seller->id, 'name' => 'Vieilli']);

        $this->getJson('/api/v1/products/vieilli')
            ->assertNotFound();
    }
}
