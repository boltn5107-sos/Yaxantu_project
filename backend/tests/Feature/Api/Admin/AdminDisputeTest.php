<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Dispute;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDisputeTest extends TestCase
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

    private function openDispute(): array
    {
        $sellerUser = User::factory()->create();
        $sellerUser->assignRole(Role::Seller);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'active']);
        $category = Category::query()->firstOrFail();

        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Article Médiation',
            'price_minor' => 12000,
            'stock_quantity' => 5,
        ]);

        $buyer = $this->buyer();

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Maroua'],
                'payment_method' => 'cod',
                'shipping_approved' => true,
            ]);

        $order = Order::query()->latest('id')->firstOrFail();
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/delivered');

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/disputes', [
                'order_id' => $order->id,
                'title' => 'Article non conforme',
                'description' => 'La couleur ne correspond pas.',
            ]);

        $dispute = Dispute::query()->latest('id')->firstOrFail();

        return ['dispute' => $dispute, 'order' => $order, 'seller' => $seller, 'buyer' => $buyer];
    }

    public function test_admin_lists_and_reads_disputes(): void
    {
        ['dispute' => $dispute] = $this->openDispute();

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/disputes')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $dispute->id);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/disputes/'.$dispute->id)
            ->assertOk()
            ->assertJsonPath('data.status', 'open')
            ->assertJsonStructure(['data' => ['messages', 'order', 'buyer']]);
    }

    public function test_admin_resolves_dispute_with_full_refund(): void
    {
        ['dispute' => $dispute, 'order' => $order] = $this->openDispute();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/disputes/'.$dispute->id.'/resolve', [
                'action' => 'refund_full',
                'note' => 'Nous remboursons l\'article.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $dispute->refresh();
        $this->assertSame('resolved', $dispute->status);
        $this->assertSame('refund_full', $dispute->resolution['action']);
        $this->assertSame((int) $order->total_minor, (int) $dispute->resolution['amount_minor']);
        $this->assertNotNull($dispute->resolved_at);

        $order->refresh();
        $this->assertSame('refunded', $order->payment_status);
    }

    public function test_moderator_can_resolve_dispute_without_refund(): void
    {
        ['dispute' => $dispute] = $this->openDispute();

        $this->actingAs($this->moderator(), 'sanctum')
            ->postJson('/api/v1/admin/disputes/'.$dispute->id.'/resolve', [
                'action' => 'no_refund',
                'note' => 'Réclamation non fondée.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved');
    }

    public function test_partial_refund_requires_amount(): void
    {
        ['dispute' => $dispute] = $this->openDispute();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/disputes/'.$dispute->id.'/resolve', [
                'action' => 'refund_partial',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount_minor']);
    }

    public function test_partial_refund_cannot_exceed_order_total(): void
    {
        ['dispute' => $dispute] = $this->openDispute();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/disputes/'.$dispute->id.'/resolve', [
                'action' => 'refund_partial',
                'amount_minor' => 99999999,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount_minor']);
    }

    public function test_resolved_dispute_cannot_be_resolved_again(): void
    {
        ['dispute' => $dispute] = $this->openDispute();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/disputes/'.$dispute->id.'/resolve', ['action' => 'no_refund']);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/disputes/'.$dispute->id.'/resolve', ['action' => 'no_refund'])
            ->assertUnprocessable();
    }

    public function test_buyer_cannot_access_admin_disputes(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')
            ->getJson('/api/v1/admin/disputes')
            ->assertForbidden();
    }
}