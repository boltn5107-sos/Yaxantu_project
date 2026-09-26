<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Boutique publique + comptage des visites/partages via le lien partagé. */
class ShopTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function onboardedShop(): Seller
    {
        return Seller::factory()->create([
            'shop_name' => 'Boutique Grand-Mer',
            'slug' => 'boutique-grand-mer',
            'description' => 'Au cœur de Douala.',
            'status' => 'active',
            'is_onboarded' => true,
            'verified_at' => now(),
            'verification_level' => 2,
            'trust_score' => 84,
            'location_address' => 'Akwa, Douala',
        ]);
    }

    public function test_public_shop_returns_shop_and_only_active_products(): void
    {
        $seller = $this->onboardedShop();

        Product::factory()->create([
            'seller_id' => $seller->id,
            'name' => 'Pagne Wax 6 yards',
            'price_minor' => 25000,
            'stock_quantity' => 10,
        ]);

        Product::factory()->inactive()->create([
            'seller_id' => $seller->id,
            'name' => 'Produit caché',
        ]);

        $this->getJson('/api/v1/sellers/boutique-grand-mer')
            ->assertOk()
            ->assertJsonPath('data.shop.shop_name', 'Boutique Grand-Mer')
            ->assertJsonPath('data.shop.verified', true)
            ->assertJsonPath('data.shop.trust_score', 84)
            ->assertJsonPath('data.meta.total_products', 1)
            ->assertJsonPath('data.products.0.name', 'Pagne Wax 6 yards')
            ->assertJsonStructure(['data' => ['shop' => ['share_link', 'logo', 'sales_count'], 'products' => []]]);

        $this->assertDatabaseCount('shop_visits', 1);
        $this->assertDatabaseHas('shop_visits', ['seller_id' => $seller->id, 'kind' => 'visit']);
    }

    public function test_referred_visit_is_tracked_with_ref_and_channel(): void
    {
        $referee = User::factory()->create();
        $seller = $this->onboardedShop();

        $this->getJson('/api/v1/sellers/boutique-grand-mer?ref='.$referee->id.'&channel=whatsapp')
            ->assertOk();

        $this->assertDatabaseHas('shop_visits', [
            'seller_id' => $seller->id,
            'kind' => 'visit',
            'channel' => 'whatsapp',
            'ref_user_id' => $referee->id,
        ]);
    }

    public function test_owner_own_visit_is_not_counted(): void
    {
        $seller = $this->onboardedShop();
        $owner = $seller->user;

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/sellers/boutique-grand-mer?ref='.$owner->id)
            ->assertOk();

        $this->assertDatabaseMissing('shop_visits', ['seller_id' => $seller->id]);
    }

    public function test_unknown_slug_returns_404(): void
    {
        $this->getJson('/api/v1/sellers/inexistante')->assertNotFound();
    }

    public function test_seller_can_see_share_stats_and_track_a_share(): void
    {
        $shop = $this->onboardedShop();
        $owner = $shop->user;

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/seller/shop')
            ->assertOk()
            ->assertJsonStructure(['data' => ['shop' => ['share_link', 'is_onboarded'], 'stats' => ['shares_by_channel', 'visits_today']]]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/v1/seller/shop/share', ['channel' => 'instagram'])
            ->assertOk()
            ->assertJsonPath('data.channel', 'instagram')
            ->assertJsonPath('data.total', 1);

        $this->assertDatabaseHas('shop_visits', [
            'seller_id' => $shop->id,
            'kind' => 'share',
            'channel' => 'instagram',
        ]);
    }

    public function test_seller_updates_shop_location(): void
    {
        $shop = Seller::factory()->create([
            'shop_name' => 'Boutique Position',
            'slug' => 'boutique-position',
            'status' => 'active',
            'is_onboarded' => true,
            'location_lat' => null,
            'location_lng' => null,
        ]);
        $owner = $shop->user;

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/v1/seller/shop/location', [
                'location_lat' => 12.3714,
                'location_lng' => -1.5197,
                'location_address' => 'Ouagadougou',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Position de la boutique enregistrée.')
            ->assertJsonPath('data.location.address', 'Ouagadougou');

        $fresh = $shop->fresh();
        $this->assertSame(12.3714, (float) $fresh->location_lat);
        $this->assertSame(-1.5197, (float) $fresh->location_lng);
        $this->assertSame('Ouagadougou', $fresh->location_address);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/seller/shop')
            ->assertOk()
            ->assertJsonPath('data.shop.has_location', true)
            ->assertJsonPath('data.shop.location.lat', 12.3714);
    }

    public function test_shop_location_update_requires_a_seller_profile(): void
    {
        $buyer = User::factory()->create();

        $this->actingAs($buyer, 'sanctum')
            ->putJson('/api/v1/seller/shop/location', [
                'location_lat' => 12.3714,
                'location_lng' => -1.5197,
            ])
            ->assertForbidden();
    }
}