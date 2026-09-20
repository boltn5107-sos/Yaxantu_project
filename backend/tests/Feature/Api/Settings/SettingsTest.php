<?php

namespace Tests\Feature\Api\Settings;

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function user(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Buyer);

        return $user;
    }

    public function test_settings_returns_groups(): void
    {
        $this->actingAs($user = $this->user(), 'sanctum')
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['account', 'accessibility', 'notifications', 'payment_methods', 'security'],
            ]);
    }

    public function test_settings_update_saves_preferences(): void
    {
        $user = $this->user();

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/settings', [
                'name' => 'Nouveau nom',
                'voice_mode' => true,
                'large_text' => true,
                'notify_sms' => false,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Paramètres enregistrés.');

        $user->refresh();

        $this->assertSame('Nouveau nom', $user->name);
        $this->assertTrue($user->voice_mode);
        $this->assertFalse($user->notify_sms);
    }

    public function test_pin_settings_roundtrip(): void
    {
        $user = $this->user();

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/settings/security/pin', [
                'pin' => '1234',
                'pin_confirmation' => '1234',
            ])
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/settings/security/pin/verify', ['pin' => '1234'])
            ->assertOk()
            ->assertJsonPath('verified', true);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/settings/security/pin/verify', ['pin' => '9999'])
            ->assertUnprocessable();
    }

    public function test_biometric_register_and_unlock(): void
    {
        $user = $this->user();

        $challenge = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/settings/security/biometric/challenge', [])
            ->assertOk()
            ->json('challenge');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/settings/security/biometric/register', [
                'credential_id' => 'cred-'.str_repeat('a', 20),
                'public_key' => base64_encode('fake-cbor-public-key'),
                'platform' => 'mobile',
                'client_data_json' => base64_encode(json_encode([
                    'challenge' => $challenge,
                    'type' => 'webauthn.create',
                    'origin' => 'http://localhost',
                ])),
            ])
            ->assertCreated()
            ->assertJsonPath('data.security.biometric_enabled', true);

        $unlockChallenge = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/settings/security/biometric/challenge', ['credential_id' => 'cred-'.str_repeat('a', 20)])
            ->assertOk()
            ->json('challenge');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/settings/security/biometric/unlock', [
                'credential_id' => 'cred-'.str_repeat('a', 20),
                'client_data_json' => base64_encode(json_encode([
                    'challenge' => $unlockChallenge,
                    'type' => 'webauthn.get',
                    'origin' => 'http://localhost',
                ])),
                'authenticator_data' => base64_encode('authData'),
                'signature' => base64_encode('signatureBytes'),
            ])
            ->assertOk()
            ->assertJsonPath('data.phone', $user->phone);
    }

    public function test_help_contact_creates_ticket(): void
    {
        $this->actingAs($this->user(), 'sanctum')
            ->postJson('/api/v1/settings/help/contact', [
                'message' => 'J\'ai besoin d\'aide pour ma boutique.',
            ])
            ->assertOk()
            ->assertJsonStructure(['message', 'ticket']);
    }
}