<?php

namespace Tests\Feature\Api\Auth;

use App\Enums\Role;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhoneAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_request_code_returns_dev_code_and_phone(): void
    {
        $response = $this->postJson('/api/v1/auth/phone/request-code', [
            'phone' => '699 11 22 33',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure(['message', 'phone', 'expires_in_seconds', 'dev_code']);

        $this->assertSame(6, strlen((string) $response->json('dev_code')));
        $this->assertSame('699112233', $response->json('phone'));
    }

    public function test_verify_code_creates_user_and_logs_in(): void
    {
        $request = $this->postJson('/api/v1/auth/phone/request-code', ['phone' => '655556677'])->json();
        $code = $request['dev_code'];

        $response = $this->postJson('/api/v1/auth/phone/verify-code', [
            'phone' => '655556677',
            'code' => $code,
            'name' => 'Awa',
        ]);

        $response
            ->assertStatus(201)
            ->assertJsonPath('data.phone', '655556677')
            ->assertJsonPath('data.roles', ['buyer'])
            ->assertJsonPath('data.needs_profile_choice', true);

        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['phone' => '655556677']);
    }

    public function test_verify_code_rejects_wrong_code(): void
    {
        $this->postJson('/api/v1/auth/phone/request-code', ['phone' => '677889900']);

        $this->postJson('/api/v1/auth/phone/verify-code', ['phone' => '677889900', 'code' => '000000'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }

    public function test_choose_seller_profile_creates_draft_shop(): void
    {
        $user = User::factory()->create(['phone' => '611223344', 'email' => null, 'password' => null]);
        $user->assignRole(Role::Buyer);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/profile', ['type' => 'seller']);

        $response
            ->assertOk()
            ->assertJsonPath('data.roles', ['buyer', 'seller']);

        $this->assertDatabaseHas('sellers', ['user_id' => $user->id, 'status' => 'draft']);
    }

    public function test_choose_delivery_profile_creates_courier(): void
    {
        $user = User::factory()->create(['phone' => '622334455', 'email' => null, 'password' => null]);
        $user->assignRole(Role::Buyer);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/profile', ['type' => 'delivery']);

        $response
            ->assertOk()
            ->assertJsonPath('data.roles', ['buyer', 'delivery'])
            ->assertJsonPath('data.courier.status', 'draft');

        $this->assertDatabaseHas('couriers', ['user_id' => $user->id]);
    }

    public function test_sponsor_boosts_trust_score(): void
    {
        $sponsorUser = User::factory()->create(['phone' => '600111222', 'email' => null, 'password' => null]);
        $sponsorUser->assignRole(Role::Seller);
        Seller::factory()->create(['user_id' => $sponsorUser->id, 'status' => 'active']);

        $user = User::factory()->create(['phone' => '633445566', 'email' => null, 'password' => null]);
        $user->assignRole(Role::Buyer);
        $seller = Seller::factory()->create(['user_id' => $user->id, 'status' => 'draft']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/onboarding/sponsor', ['sponsor_phone' => '600 111 222'])
            ->assertOk()
            ->assertJsonPath('sponsor.shop_name', $sponsorUser->seller->shop_name);

        $seller->refresh();

        $this->assertSame($sponsorUser->seller->id, $seller->sponsor_id);
        $this->assertGreaterThan(0, (int) $seller->trust_score);
    }

    public function test_sponsor_rejects_unknown_phone(): void
    {
        $user = User::factory()->create(['phone' => '633445577', 'email' => null, 'password' => null]);
        $user->assignRole(Role::Buyer);
        Seller::factory()->create(['user_id' => $user->id, 'status' => 'draft']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/onboarding/sponsor', ['sponsor_phone' => '699999999'])
            ->assertUnprocessable();
    }
}