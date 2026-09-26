<?php

namespace Tests\Feature\Api;

use App\Enums\Role;
use App\Models\Conversation;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class MessagingTest extends TestCase
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

    private function seller(): Seller
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
            'shop_name' => 'Boutique Test',
        ]);
    }

    public function test_messages_require_authentication(): void
    {
        $this->getJson('/api/v1/messages')->assertUnauthorized();
    }

    public function test_buyer_starts_conversation_and_sends_text(): void
    {
        $buyer = $this->buyer();
        $seller = $this->seller();

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/messages/start', ['seller_id' => $seller->id])
            ->assertOk()
            ->assertJsonPath('data.conversation.partner.role', 'seller')
            ->assertJsonPath('data.conversation.partner.name', 'Boutique Test');

        $conversation = Conversation::query()->firstOrFail();

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/messages/'.$conversation->id.'/messages', ['text' => 'Bonjour, le produit est-il disponible ?'])
            ->assertOk();

        $this->assertDatabaseHas('chat_messages', [
            'conversation_id' => $conversation->id,
            'kind' => 'text',
            'text' => 'Bonjour, le produit est-il disponible ?',
        ]);
    }

    public function test_seller_replies_and_buyer_reads_messages(): void
    {
        $seller = $this->seller();
        $sellerUser = User::query()->findOrFail($seller->user_id);
        $buyer = $this->buyer();

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/messages/start', ['seller_id' => $seller->id]);

        $conversation = Conversation::query()->firstOrFail();

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/messages/'.$conversation->id.'/messages', ['text' => 'Hello']);

        $this->actingAs($sellerUser, 'sanctum')
            ->getJson('/api/v1/messages')
            ->assertOk()
            ->assertJsonCount(1, 'data.conversations')
            ->assertJsonPath('data.conversations.0.partner.role', 'buyer');

        // Le vendeur consulte puis répond : le message est passé en lu.
        $this->actingAs($sellerUser, 'sanctum')
            ->getJson('/api/v1/messages/'.$conversation->id)
            ->assertOk();

        $this->assertDatabaseHas('chat_messages', [
            'conversation_id' => $conversation->id,
            'sender_id' => $buyer->id,
            'read_at' => $conversation->fresh()->messages()->first()->read_at,
        ]);
    }

    public function test_voice_note_is_stored(): void
    {
        $buyer = $this->buyer();
        $seller = $this->seller();

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/messages/start', ['seller_id' => $seller->id]);

        $conversation = Conversation::query()->firstOrFail();

        $this->actingAs($buyer, 'sanctum')
            ->post('/api/v1/messages/'.$conversation->id.'/messages', [
                'voice_note' => UploadedFile::fake()->createWithContent(
                    'note.mp3',
                    "\xFF\xFB\x90\x64".str_repeat("\x00", 256),
                ),
            ])
            ->assertOk();

        $this->assertDatabaseHas('chat_messages', [
            'conversation_id' => $conversation->id,
            'kind' => 'voice',
        ]);

        $this->assertNotNull($conversation->messages()->first()->voice_path);
    }

    public function test_self_conversation_is_rejected(): void
    {
        $sellerUser = User::query()->find($this->seller()->user_id);

        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/messages/start', ['seller_id' => $sellerUser->seller->id])
            ->assertUnprocessable();
    }
}