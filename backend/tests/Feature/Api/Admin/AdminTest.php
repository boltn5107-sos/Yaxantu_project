<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\Role;
use App\Models\Banner;
use App\Models\PromoCode;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Admin);

        return $user;
    }

    private function moderator(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Moderator);

        return $user;
    }

    private function buyer(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Buyer);

        return $user;
    }

    public function test_non_admin_is_forbidden_from_dashboard(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertForbidden();
    }

    public function test_admin_can_read_dashboard_stats(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'users' => ['total', 'active', 'suspended', 'banned'],
                    'orders' => ['total', 'active', 'delivered', 'cancelled', 'revenue', 'revenue_today'],
                    'sellers' => ['total', 'pending', 'active'],
                    'couriers' => ['total', 'pending', 'approved'],
                    'products' => ['total', 'active', 'featured'],
                    'marketing' => ['promo_codes', 'active_promo_codes', 'referrals', 'rewarded_referrals'],
                ],
            ]);
    }

    public function test_admin_can_list_and_update_users(): void
    {
        $target = $this->buyer();

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'name', 'status', 'roles']], 'meta' => ['total']]);

        $this->actingAs($this->admin(), 'sanctum')
            ->patchJson('/api/v1/admin/users/'.$target->id, ['status' => 'suspended'])
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'suspended']);
    }

    public function test_admin_can_assign_and_remove_roles(): void
    {
        $target = $this->buyer();

        $this->actingAs($this->admin(), 'sanctum')
            ->patchJson('/api/v1/admin/users/'.$target->id.'/role', ['role' => 'moderator', 'action' => 'assign'])
            ->assertOk();

        $this->assertTrue($target->refresh()->isModerator());

        $this->actingAs($this->admin(), 'sanctum')
            ->patchJson('/api/v1/admin/users/'.$target->id.'/role', ['role' => 'moderator', 'action' => 'remove'])
            ->assertOk();

        $this->assertFalse($target->refresh()->isModerator());
    }

    public function test_buyer_cannot_manage_banners(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')
            ->postJson('/api/v1/admin/banners', [
                'title' => 'Promo',
                'image_url' => 'https://images.unsplash.com/photo-111',
            ])
            ->assertForbidden();
    }

    public function test_moderator_can_read_admin_but_not_manage_banners(): void
    {
        $this->actingAs($this->moderator(), 'sanctum')
            ->getJson('/api/v1/admin/banners')
            ->assertOk();

        $this->actingAs($this->moderator(), 'sanctum')
            ->postJson('/api/v1/admin/banners', [
                'title' => 'Promo',
                'image_url' => 'https://images.unsplash.com/photo-111',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_create_update_and_delete_banner(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/banners', [
                'title' => 'Nouvelle campagne',
                'subtitle' => 'Sous-titre',
                'image_url' => 'https://images.unsplash.com/photo-111',
                'link' => '/search',
                'sort_order' => 1,
                'is_active' => true,
            ])
            ->assertCreated();

        $banner = Banner::firstOrFail();
        $this->assertSame('Nouvelle campagne', $banner->title);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/v1/admin/banners/'.$banner->id, [
                'title' => 'Campagne 2',
                'image_url' => 'https://images.unsplash.com/photo-222',
            ])
            ->assertOk();

        $this->assertSame('Campagne 2', $banner->refresh()->title);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/v1/admin/banners/'.$banner->id)
            ->assertOk();

        $this->assertDatabaseMissing('banners', ['id' => $banner->id]);
    }

    public function test_admin_can_manage_promo_codes(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/promo-codes', [
                'code' => 'ETE2026',
                'discount_type' => 'percent',
                'discount_value' => 15,
                'min_order_minor' => 5000,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('promo_codes', ['code' => 'ETE2026', 'discount_value' => 15]);

        $code = PromoCode::where('code', 'ETE2026')->firstOrFail();

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/v1/admin/promo-codes/'.$code->id, [
                'code' => 'ETE2026',
                'description' => 'Été',
                'discount_type' => 'percent',
                'discount_value' => 20,
            ])
            ->assertOk();

        $this->assertSame(20, $code->refresh()->discount_value);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson('/api/v1/admin/promo-codes/'.$code->id)
            ->assertOk();

        $this->assertDatabaseMissing('promo_codes', ['id' => $code->id]);
    }

    public function test_admin_can_verify_a_seller_shop(): void
    {
        $sellerUser = User::factory()->create();
        $sellerUser->assignRole(Role::Seller);
        $seller = Seller::factory()->create([
            'user_id' => $sellerUser->id,
            'status' => 'pending_verification',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/sellers')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'pending_verification');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/sellers/'.$seller->id.'/verify')
            ->assertOk();

        $this->assertDatabaseHas('sellers', [
            'id' => $seller->id,
            'status' => 'active',
            'verification_level' => 2,
        ]);
    }
}