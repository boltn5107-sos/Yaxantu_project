<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\Role;
use App\Models\Courier;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCourierTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Admin);

        return $user;
    }

    private function courier(string $status): Courier
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Delivery);

        return Courier::create([
            'user_id' => $user->id,
            'status' => $status,
            'transport_type' => 'bike',
            'zone_address' => 'Dakar Plateau',
            'identity_photo_path' => 'couriers/id-1.jpg',
            'selfie_path' => 'couriers/selfie-1.jpg',
            'payout_method' => 'wave',
        ]);
    }

    public function test_admin_lists_pending_couriers_with_photo_urls(): void
    {
        $this->courier('pending');

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/couriers/pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.transport_type', 'bike')
            ->assertJsonPath('data.0.zone_address', 'Dakar Plateau')
            ->assertJsonPath('data.0.payout_method', 'wave');

        $data = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/couriers/pending')
            ->json('data');
        $this->assertStringEndsWith('/storage/couriers/id-1.jpg', $data[0]['identity_photo']);
        $this->assertStringEndsWith('/storage/couriers/selfie-1.jpg', $data[0]['selfie']);
    }

    public function test_admin_approves_a_courier_and_notifies_him(): void
    {
        $courier = $this->courier('pending');
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/approve')
            ->assertOk();

        $this->assertDatabaseHas('couriers', [
            'id' => $courier->id,
            'status' => 'approved',
        ]);
        $this->assertNotNull($courier->refresh()->approved_at);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $courier->user_id,
            'type' => 'delivery.approved',
        ]);
    }

    public function test_admin_rejects_a_courier_with_reason(): void
    {
        $courier = $this->courier('pending');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/reject')
            ->assertStatus(422);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/reject', ['reason' => 'Moto non assurée'])
            ->assertOk();

        $this->assertDatabaseHas('couriers', [
            'id' => $courier->id,
            'status' => 'rejected',
            'reject_reason' => 'Moto non assurée',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $courier->user_id,
            'type' => 'delivery.rejected',
        ]);
    }

    public function test_admin_suspends_and_reactivates_an_approved_courier(): void
    {
        $courier = $this->courier('approved');
        $courier->forceFill([
            'approved_at' => now()->subDay(),
            'available' => true,
        ])->save();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/suspend')
            ->assertOk();

        $this->assertDatabaseHas('couriers', [
            'id' => $courier->id,
            'status' => 'suspended',
            'available' => false,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $courier->user_id,
            'type' => 'delivery.suspended',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/reactivate')
            ->assertOk();

        $this->assertDatabaseHas('couriers', ['id' => $courier->id, 'status' => 'approved']);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $courier->user_id,
            'type' => 'delivery.reactivated',
        ]);
    }

    public function test_courier_status_transitions_are_validated(): void
    {
        $pending = $this->courier('pending');
        $suspended = $this->courier('suspended');

        // Un livreur non approuvé ne peut pas être suspendu.
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$pending->id.'/suspend')
            ->assertStatus(422);

        // Un livreur non suspendu ne peut pas être réactivé.
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$pending->id.'/reactivate')
            ->assertStatus(422);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$suspended->id.'/suspend')
            ->assertStatus(422);
    }

    public function test_moderator_can_manage_couriers(): void
    {
        $moderator = User::factory()->create();
        $moderator->assignRole(Role::Moderator);
        $courier = $this->courier('pending');

        $this->actingAs($moderator, 'sanctum')
            ->getJson('/api/v1/admin/couriers/pending')
            ->assertOk();

        $this->actingAs($moderator, 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/approve')
            ->assertOk();

        $this->assertDatabaseHas('couriers', ['id' => $courier->id, 'status' => 'approved']);
    }
}