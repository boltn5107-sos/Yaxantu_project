<?php

namespace Tests\Feature\Api\Notification;

use App\Enums\Role;
use App\Models\Notification;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function buyer(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Buyer);

        return $user;
    }

    public function test_index_returns_own_notifications(): void
    {
        $user = $this->buyer();
        $other = $this->buyer();

        Notification::create([
            'user_id' => $user->id,
            'type' => 'order.created',
            'title' => 'Commande enregistrée',
            'message' => 'Votre commande YX-1 a été créée.',
        ]);
        Notification::create([
            'user_id' => $other->id,
            'type' => 'order.created',
            'title' => 'Autre',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Commande enregistrée');
    }

    public function test_unread_count(): void
    {
        $user = $this->buyer();

        Notification::create(['user_id' => $user->id, 'type' => 'a', 'title' => 'Non lue', 'is_read' => false]);
        Notification::create(['user_id' => $user->id, 'type' => 'b', 'title' => 'Lue', 'is_read' => true]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 1);
    }

    public function test_mark_read_sets_read_state(): void
    {
        $user = $this->buyer();
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'order.paid',
            'title' => 'Paiement confirmé',
            'is_read' => false,
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/notifications/'.$notification->id.'/read')
            ->assertOk();

        $this->assertDatabaseHas('notifications', ['id' => $notification->id, 'is_read' => true]);
    }

    public function test_mark_all_read(): void
    {
        $user = $this->buyer();
        $other = $this->buyer();

        $n1 = Notification::create(['user_id' => $user->id, 'type' => 'a', 'title' => 'Une', 'is_read' => false]);
        $n2 = Notification::create(['user_id' => $user->id, 'type' => 'b', 'title' => 'Deux', 'is_read' => false]);
        $n3 = Notification::create(['user_id' => $other->id, 'type' => 'c', 'title' => 'Autre', 'is_read' => false]);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/notifications/read-all')
            ->assertOk();

        $this->assertDatabaseHas('notifications', ['id' => $n1->id, 'is_read' => true]);
        $this->assertDatabaseHas('notifications', ['id' => $n2->id, 'is_read' => true]);
        $this->assertDatabaseHas('notifications', ['id' => $n3->id, 'is_read' => false]);
    }
}