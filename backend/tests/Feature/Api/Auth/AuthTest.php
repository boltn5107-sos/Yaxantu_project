<?php

namespace Tests\Feature\Api\Auth;

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    // ── Inscription ─────────────────────────────────────────────────────

    public function test_register_creates_user_and_returns_201(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Awa Diallo',
            'email' => 'awa@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.email', 'awa@example.com')
            ->assertJsonPath('data.roles', ['buyer'])
            ->assertJsonStructure([
                'message',
                'data' => ['id', 'name', 'email', 'roles', 'status'],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'awa@example.com']);
        $buyerRoleId = \App\Models\Role::where('slug', Role::Buyer->value)->first()?->id;
        $this->assertDatabaseHas('role_user', [
            'user_id' => $response->json('data.id'),
            'role_id' => $buyerRoleId,
        ]);
    }

    public function test_register_validates_required_fields(): void
    {
        $this->postJson('/api/v1/auth/register', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Dup User',
            'email' => 'dup@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    // ── Connexion ───────────────────────────────────────────────────────

    public function test_login_returns_user_with_session_cookie(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('Password123'),
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'login@example.com',
            'password' => 'Password123',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.email', 'login@example.com');

        $this->assertAuthenticated();
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create(['email' => 'bad@example.com']);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'bad@example.com',
            'password' => 'WrongPass',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_rejects_suspended_user(): void
    {
        User::factory()->create([
            'email' => 'suspended@example.com',
            'password' => Hash::make('Password123'),
            'status' => 'suspended',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'Password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    // ── Déconnexion ─────────────────────────────────────────────────────

    public function test_logout_invalidates_session(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertGuest();
    }

    // ── Utilisateur courant ─────────────────────────────────────────────

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Buyer);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/me');

        $response
            ->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.roles', ['buyer']);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized();
    }

    // ── Réinitialisation mot de passe ───────────────────────────────────

    public function test_forgot_password_returns_success_message(): void
    {
        User::factory()->create(['email' => 'reset@example.com']);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'reset@example.com',
        ]);

        $response->assertOk()->assertJsonPath('message', __('passwords.sent'));
    }

    public function test_forgot_password_rejects_unknown_email(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'unknown@example.com',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_reset_password_works_with_valid_token(): void
    {
        $user = User::factory()->create(['email' => 'rst@example.com']);

        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'rst@example.com',
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
            'token' => $token,
        ]);

        $response->assertOk()->assertJsonPath('message', __('passwords.reset'));

        $user->refresh();
        $this->assertTrue(Hash::check('NewPass123!', $user->password));
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        User::factory()->create(['email' => 'rst2@example.com']);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'rst2@example.com',
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
            'token' => 'invalid-token-abc',
        ])->assertUnprocessable();
    }
}
