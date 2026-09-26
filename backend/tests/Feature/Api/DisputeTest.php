<?php

namespace Tests\Feature\Api;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class DisputeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
    }

    private function deliverOrder(): array
    {
        $sellerUser = User::factory()->create();
        $sellerUser->assignRole(Role::Seller);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'active']);
        $category = Category::query()->firstOrFail();

        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Article Litige',
            'price_minor' => 12000,
            'stock_quantity' => 5,
        ]);

        $buyer = User::factory()->create();
        $buyer->assignRole(Role::Buyer);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Bafoussam', 'latitude' => 5.1478, 'longitude' => 10.4171],
                'payment_method' => 'cod',
                'shipping_approved' => true,
            ]);

        $order = Order::query()->latest('id')->firstOrFail();
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/accept');
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/delivered');

        $order->refresh();

        return ['order' => $order, 'seller' => $seller];
    }

    public function test_buyer_opens_dispute_with_photo_and_voice(): void
    {
        ['order' => $order] = $this->deliverOrder();
        $buyer = $order->user;

        $this->actingAs($buyer, 'sanctum')
            ->post('/api/v1/disputes', [
                'order_id' => $order->id,
                'title' => 'Article abîmé',
                'photo' => UploadedFile::fake()->image('abime.png'),
                'voice_note' => UploadedFile::fake()->create('explication.wav', 200, 'audio/wav'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'open');

        $this->assertDatabaseHas('disputes', [
            'order_id' => $order->id,
            'status' => 'open',
        ]);
    }

    public function test_dispute_requires_an_explanation(): void
    {
        ['order' => $order] = $this->deliverOrder();
        $buyer = $order->user;

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/disputes', ['order_id' => $order->id])
            ->assertUnprocessable();
    }

    public function test_participants_can_message_the_dispute(): void
    {
        ['order' => $order, 'seller' => $_seller] = $this->deliverOrder();
        $buyer = $order->user;
        $sellerUser = $order->seller->user;

        $disputeId = $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/disputes', [
                'order_id' => $order->id,
                'description' => 'Reçu cassé',
            ])
            ->json('data.id');

        $this->actingAs($buyer, 'sanctum')
            ->post('/api/v1/disputes/'.$disputeId.'/messages', [
                'photo' => UploadedFile::fake()->image('casse.png'),
            ])
            ->assertCreated();

        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/disputes/'.$disputeId.'/messages', [
                'text' => 'Nous vous échangeons l\'article.',
            ])
            ->assertCreated();

        $this->actingAs($buyer, 'sanctum')
            ->getJson('/api/v1/disputes')
            ->assertOk()
            ->assertJsonPath('data.0.id', $disputeId)
            ->assertJsonPath('data.0.messages_count', 2);
    }
}