<?php

namespace Tests\Feature\Api\Payment;

use App\Enums\Role;
use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
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

        return Seller::factory()->create(['user_id' => $user->id, 'status' => 'active']);
    }

    private function orderWithPendingPayment(User $user, string $method = 'mobile_money'): Payment
    {
        $seller = $this->seller();
        $category = Category::where('slug', 'electronique')->first();

        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => 'Téléphone Payé',
            'price_minor' => 15000,
            'stock_quantity' => 4,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Douala'],
                'payment_method' => $method,
                'mobile_money_phone' => '691234567',
                'shipping_approved' => true,
            ])
            ->assertCreated();

        return Payment::query()->latest()->firstOrFail();
    }

    public function test_payment_methods_are_public(): void
    {
        $this->getJson('/api/v1/payment-methods')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.id', 'cod')
            ->assertJsonPath('data.2.id', 'wave');
    }

    public function test_callback_confirms_payment_and_updates_order(): void
    {
        $user = $this->buyer();
        $payment = $this->orderWithPendingPayment($user);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/payments/'.$payment->id.'/callback', ['status' => 'success']);

        $response
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'paid',
        ]);

        $order = $payment->order;
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => OrderStatus::Paid->value,
            'payment_status' => 'paid',
        ]);

        // Crédite le solde (en attente) du vendeur.
        $this->assertDatabaseHas('seller_balances', [
            'seller_id' => $order->seller_id,
            'amount_pending' => 15000,
        ]);
    }

    public function test_callback_is_idempotent(): void
    {
        $user = $this->buyer();
        $payment = $this->orderWithPendingPayment($user);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/payments/'.$payment->id.'/callback', ['status' => 'success'])
            ->assertOk();

        // Seconde confirmation : aucun double crédit.
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/payments/'.$payment->id.'/callback', ['status' => 'success'])
            ->assertOk()
            ->assertJsonPath('status', 'confirmed');

        $this->assertDatabaseHas('seller_balances', [
            'seller_id' => $payment->order->seller_id,
            'amount_pending' => 15000,
        ]);
    }

    public function test_callback_failed_marks_payment_failed(): void
    {
        $user = $this->buyer();
        $payment = $this->orderWithPendingPayment($user);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/payments/'.$payment->id.'/callback', ['status' => 'failed'])
            ->assertOk()
            ->assertJsonPath('status', 'failed');

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'failed']);
    }

    public function test_callback_validates_status(): void
    {
        $user = $this->buyer();
        $payment = $this->orderWithPendingPayment($user);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/payments/'.$payment->id.'/callback', ['status' => 'unknown'])
            ->assertUnprocessable();
    }
}