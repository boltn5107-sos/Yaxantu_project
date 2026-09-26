<?php

namespace Tests\Feature\Api\Seller;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Les produits d'un vendeur : création bloquée sans boutique (onboarding). */
class SellerProductTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
    }

    private function sellerUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return $user;
    }

    private function categoryId(): int
    {
        return Category::query()->firstOrFail()->getKey();
    }

    public function test_adding_product_is_blocked_without_onboarded_shop(): void
    {
        $user = $this->sellerUser();
        Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'draft',
            'is_onboarded' => false,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/products', [
                'name' => 'Sac à main',
                'price_minor' => 5000,
                'stock_quantity' => 5,
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Créez d\'abord votre boutique (5 étapes) avant d\'ajouter un produit.');
    }

    public function test_user_without_seller_profile_gets_validation_error(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/products', ['name' => 'Article'])
            ->assertStatus(422);
    }

    public function test_onboarded_seller_can_create_and_list_own_products(): void
    {
        Storage::fake('public');

        $user = $this->sellerUser();
        Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
            'is_onboarded' => true,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/products', [
                'name' => 'Sac à main en raphia',
                'price_minor' => 8000,
                'stock_quantity' => 8,
                'category_id' => $this->categoryId(),
                'requires_shipping' => true,
                'images' => [
                    UploadedFile::fake()->image('sac1.jpg'),
                    UploadedFile::fake()->image('sac2.jpg'),
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Sac à main en raphia')
            ->assertJsonPath('data.price', 8000)
            ->assertJsonCount(2, 'data.images');

        $this->assertNotEmpty(Storage::disk('public')->files('products'));

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/seller/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Sac à main en raphia');

        $product = $user->seller->products()->firstOrFail();

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/seller/products/'.$product->slug, ['price_minor' => 9500, 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.price', 9500)
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/seller/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('message', 'Produit supprimé de votre boutique.');

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_seller_cannot_touch_another_sellers_product(): void
    {
        $owner = $this->sellerUser();
        $shop = Seller::factory()->create(['user_id' => $owner->id, 'is_onboarded' => true]);

        $other = $this->sellerUser();
        Seller::factory()->create(['user_id' => $other->id, 'is_onboarded' => true]);

        $product = $shop->products()->create([
            'name' => 'Bracelet perlé',
            'price_minor' => 2000,
            'stock_quantity' => 3,
            'slug' => 'bracelet-perle',
            'price_currency' => 'XOF',
        ]);

        $this->actingAs($other, 'sanctum')
            ->patchJson('/api/v1/seller/products/'.$product->slug, ['price_minor' => 1])
            ->assertForbidden();

        $this->actingAs($other, 'sanctum')
            ->deleteJson('/api/v1/seller/products/'.$product->slug)
            ->assertForbidden();
    }

    public function test_seller_can_add_short_video_alongside_photos(): void
    {
        Storage::fake('public');

        $user = $this->sellerUser();
        Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
            'is_onboarded' => true,
        ]);

        // En-tête MP4 minimale reconnue par finfo comme video/mp4.
        $mp4 = "\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom".str_repeat("\x00", 128);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/products', [
                'name' => 'Téléphone reconditionné',
                'price_minor' => 65000,
                'stock_quantity' => 3,
                'category_id' => $this->categoryId(),
                'images' => [
                    UploadedFile::fake()->image('tel.jpg'),
                    UploadedFile::fake()->createWithContent('demo.mp4', $mp4),
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.images.0.kind', 'image')
            ->assertJsonPath('data.images.1.kind', 'video');

        $this->assertStringEndsWith('.jpg', (string) $response->json('data.thumbnail'));
        $this->assertStringEndsWith('.mp4', (string) $response->json('data.images.1.path'));

        $product = $user->seller->products()->with(['images'])->firstOrFail();

        $this->assertTrue($product->images->some(fn ($image) => $image->kind === 'image'));
        $this->assertTrue($product->images->some(fn ($image) => $image->kind === 'video'));

        $files = collect(Storage::disk('public')->files('products'));
        $this->assertTrue($files->some(fn ($file) => str_ends_with($file, '.mp4')));
    }
}