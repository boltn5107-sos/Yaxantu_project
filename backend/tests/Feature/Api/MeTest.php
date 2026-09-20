<?php

namespace Tests\Feature\Api;

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized();
    }

    public function test_me_returns_authenticated_user_with_roles(): void
    {
        $user = User::factory()->create(['locale' => 'fr']);
        $user->assignRole(Role::Buyer);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.locale', 'fr')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.roles', [Role::Buyer->value]);
    }

    public function test_me_returns_seller_relation_with_onboarding_state(): void
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        \App\Models\Seller::create([
            'user_id' => $user->id,
            'shop_name' => 'Boutique Test',
            'slug' => 'boutique-test',
            'status' => 'active',
            'currency' => 'XOF',
            'is_onboarded' => true,
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.seller.shop_name', 'Boutique Test')
            ->assertJsonPath('data.seller.is_onboarded', true)
            ->assertJsonPath('data.seller.slug', 'boutique-test');
    }

    public function test_admin_role_grants_any_permission(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole(Role::Admin);

        $this->assertTrue($admin->hasPermission('products.manage'));
        $this->assertTrue($admin->can('catalog.view'));
    }

    public function test_buyer_cannot_use_seller_permissions(): void
    {
        $buyer = User::factory()->create();
        $buyer->assignRole(Role::Buyer);

        $this->assertFalse($buyer->hasPermission('products.manage'));
        $this->assertTrue($buyer->hasPermission('catalog.view'));
        $this->assertFalse($buyer->can('payouts.request'));
    }
}