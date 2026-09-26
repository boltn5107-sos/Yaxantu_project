<?php

namespace Tests\Feature\Api\Delivery;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Courier;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CourierLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
    }

    private function courierUser(string $status = 'draft'): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Delivery);
        Courier::create(['user_id' => $user->id, 'status' => $status]);

        return $user;
    }

    public function test_onboarding_four_steps_then_pending_review(): void
    {
        $user = $this->courierUser();

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/delivery/onboarding/step1', [
                'identity_photo' => UploadedFile::fake()->image('cnib.png'),
                'selfie' => UploadedFile::fake()->image('selfie.png'),
            ])
            ->assertOk()
            ->assertJsonPath('data.current_step', 1);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/delivery/onboarding/step/2', ['transport_type' => 'moto'])
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/delivery/onboarding/step/3', [
                'zone_lat' => 4.0511,
                'zone_lng' => 9.7679,
                'zone_radius_km' => 15,
                'zone_address' => 'Douala centre',
            ])
            ->assertOk();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/delivery/onboarding/step/4', [
                'payout_method' => 'wave',
                'payout_account' => '677889900',
            ]);
        $response
            ->assertOk()
            ->assertJsonPath('data.is_onboarded', true)
            ->assertJsonPath('data.next_step', null)
            ->assertJsonPath('data.status', 'pending');

        $courier = $user->courier->fresh();

        $this->assertTrue($courier->is_onboarded);
        $this->assertSame('pending', $courier->status);
        $this->assertSame('moto', $courier->transport_type);
    }

    public function test_availability_requires_approval(): void
    {
        $user = $this->courierUser('pending');

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/delivery/availability', ['available' => true])
            ->assertUnprocessable();
    }

    public function test_admin_approves_then_courier_goes_available(): void
    {
        $courierUser = $this->courierUser('pending');
        $courier = $courierUser->courier->fresh();

        $admin = User::factory()->create();
        $admin->assignRole(Role::Admin);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/approve')
            ->assertOk();

        $this->assertSame('approved', $courier->fresh()->status);

        // Nouvel état côté "serveur" : la relation mise en cache doit être rechargée.
        $courierUser->unsetRelation('courier');

        $this->actingAs($courierUser, 'sanctum')
            ->patchJson('/api/v1/delivery/availability', ['available' => true])
            ->assertOk()
            ->assertJsonPath('data.available', true);

        $this->assertTrue((bool) $courier->fresh()->available);
    }

    public function test_courier_receives_ships_and_delivers_job(): void
    {
        $courierUser = $this->courierUser('approved');
        $courierUser->courier()->first()?->forceFill(['available' => true])->save();

        $sellerUser = User::factory()->create();
        $sellerUser->assignRole(Role::Seller);
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'active']);
        $category = Category::query()->firstOrFail();

        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Colis Livreur',
            'price_minor' => 20000,
            'stock_quantity' => 5,
        ]);

        $buyer = User::factory()->create();
        $buyer->assignRole(Role::Buyer);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 5', 'city' => 'Douala', 'latitude' => 4.0511, 'longitude' => 9.7679],
                'payment_method' => 'cod',
                'shipping_approved' => true,
            ]);

        $order = Order::query()->latest('id')->firstOrFail();
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/accept');
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/ship');

        $order->refresh();

        $this->assertSame('shipped', $order->status);
        $this->assertNotNull($order->delivery->courier_id);

        // Le livreur voit la course et la récupère.
        $jobs = $this->actingAs($courierUser, 'sanctum')
            ->getJson('/api/v1/delivery/jobs')
            ->assertOk()
            ->assertJsonPath('data.0.order_number', $order->order_number);

        $deliveryId = $jobs->json('data.0.delivery_id');

        $this->actingAs($courierUser, 'sanctum')
            ->postJson('/api/v1/delivery/jobs/'.$deliveryId.'/pickup')
            ->assertOk()
            ->assertJsonPath('data.status', 'picked_up');

        $this->assertSame('in_delivery', $order->fresh()->status);

        // Livraison confirmée avec photo.
        $this->actingAs($courierUser, 'sanctum')
            ->post('/api/v1/delivery/jobs/'.$deliveryId.'/deliver', [
                'proof' => UploadedFile::fake()->image('preuve.png'),
                'notes' => 'En main propre',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');

        $order->refresh();

        $this->assertSame('delivered', $order->status);
        $this->assertSame('delivered', $order->delivery->status);
        $this->assertSame('paid', $order->payment_status);
    }

    public function test_non_admin_cannot_approve_couriers(): void
    {
        $courierUser = $this->courierUser('pending');
        $courier = $courierUser->courier->fresh();

        $buyer = User::factory()->create();
        $buyer->assignRole(Role::Buyer);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/admin/couriers/'.$courier->id.'/approve')
            ->assertForbidden();
    }
}