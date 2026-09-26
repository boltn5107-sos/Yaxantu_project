<?php

namespace Tests\Feature\Api;

use App\Enums\Role;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use App\Support\ImageHash;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VisualSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([RoleSeeder::class, CategorySeeder::class]);
        Storage::fake('public');
    }

    private function activeSeller(): Seller
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);
    }

    private function withProductImage(Product $product, string $label): UploadedFile
    {
        $image = UploadedFile::fake()->image("{$label}.png");
        $path = "products/{$label}.png";

        Storage::disk('public')->put($path, (string) file_get_contents($image->getRealPath()));

        $product->images()->create([
            'path' => $path,
            'alt_text' => $product->name,
            'is_primary' => true,
            'sort_order' => 1,
            'mime_type' => 'image/png',
            'kind' => 'image',
            'image_hash' => ImageHash::compute(Storage::disk('public')->path($path)),
        ]);

        return $image;
    }

    public function test_visual_search_returns_most_similar_product_first(): void
    {
        $seller = $this->activeSeller();

        $matching = Product::factory()->create(['seller_id' => $seller->id, 'name' => 'Chemise identique']);
        $other = Product::factory()->create(['seller_id' => $seller->id, 'name' => 'Sac à dos']);

        $sample = $this->withProductImage($matching, 'chemise');
        $this->withProductImage($other, 'sac');

        $this->post('/api/v1/products/visual-search', ['image' => $sample])
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Chemise identique');

        // La photo du produit « autre » renvoie un autre classement.
        $this->post('/api/v1/products/visual-search', ['image' => UploadedFile::fake()->image('nouvelle.png')])
            ->assertOk();
    }

    public function test_visual_search_requires_an_image(): void
    {
        $this->postJson('/api/v1/products/visual-search', [])
            ->assertStatus(422);
    }

    public function test_visual_search_requires_an_image_file(): void
    {
        $this->postJson('/api/v1/products/visual-search', ['image' => 'pas-une-image'])
            ->assertStatus(422);
    }
}