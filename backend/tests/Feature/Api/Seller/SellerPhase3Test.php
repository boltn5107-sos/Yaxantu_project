<?php

namespace Tests\Feature\Api\Seller;

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

class SellerPhase3Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
    }

    private function sellerUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return $user;
    }

    public function test_onboarding_completes_in_five_steps(): void
    {
        $user = $this->sellerUser();
        Seller::factory()->create(['user_id' => $user->id, 'status' => 'draft']);

        $category = Category::query()->firstOrFail();

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/seller/onboarding/step1', ['logo' => UploadedFile::fake()->image('logo.png')])
            ->assertOk()
            ->assertJsonPath('data.next_step', 2);

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/seller/onboarding/step/2', ['shop_name' => 'Boutique Test'])
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/seller/onboarding/step/3', ['main_category_id' => $category->id])
            ->assertOk();

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/seller/onboarding/step/4', [
                'location_lat' => 4.0511,
                'location_lng' => 9.7679,
                'location_address' => 'Bonanjo, Douala',
            ])
            ->assertOk();

        $response = $this->actingAs($user, 'sanctum')
            ->post('/api/v1/seller/onboarding/step/5', [
                'payout_method' => 'wave',
                'payout_account' => '699112233',
            ]);
        $response
            ->assertOk()
            ->assertJsonPath('data.is_onboarded', true)
            ->assertJsonPath('data.next_step', null);

        $seller = $user->seller->fresh();

        $this->assertTrue($seller->is_onboarded);
        $this->assertSame('active', $seller->status);
        $this->assertSame('wave', $seller->payout_method);
        $this->assertNotNull($seller->slug);
    }

    public function test_seller_order_lifecycle_and_escrow(): void
    {
        $sellerUser = $this->sellerUser();
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'active']);
        $category = Category::query()->firstOrFail();

        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Produit Vendu',
            'price_minor' => 15000,
            'stock_quantity' => 5,
        ]);

        $buyer = User::factory()->create();
        $buyer->assignRole(Role::Buyer);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Douala'],
                'payment_method' => 'cod',
                'shipping_approved' => true,
            ])
            ->assertCreated();

        $order = Order::query()->latest('id')->firstOrFail();
        $orderNumber = $order->order_number;

        // Liste segmentée : la commande est dans "Nouvelles".
        $this->actingAs($sellerUser, 'sanctum')
            ->getJson('/api/v1/seller/orders?segment=new')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.order_number', $orderNumber);

        // Acceptation.
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$orderNumber.'/accept')
            ->assertOk();

        $this->assertSame('preparation', $order->fresh()->status);

        // Expédition.
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$orderNumber.'/ship')
            ->assertOk()
            ->assertJsonStructure(['tracking_number']);

        $order->refresh();
        $this->assertSame('shipped', $order->status);
        $this->assertNotNull($order->tracking_number);
        $this->assertSame('shipped', $order->delivery->status);

        // Détail avec ligne de calcul transparente (vente / commission / frais / net).
        $this->actingAs($sellerUser, 'sanctum')
            ->getJson('/api/v1/seller/orders/'.$orderNumber)
            ->assertOk()
            ->assertJsonPath('data.detail.sale_price', 15000)
            ->assertJsonPath('data.detail.platform_commission', 150);

        // Livraison : COD encaissé + séquestre libéré.
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$orderNumber.'/delivered')
            ->assertOk();

        $order->refresh();
        $this->assertSame('delivered', $order->status);
        $this->assertSame('paid', $order->payment_status);

        $seller->refresh();
        $balance = $seller->balance;
        $this->assertSame(15000, (int) $balance->amount_available);
        $this->assertSame(0, (int) $balance->amount_pending);
    }

    public function test_finance_payout_and_analytics(): void
    {
        // Préparer une vente livrée (voir lifecycle) pour faire rentrer de l'argent.
        $sellerUser = $this->sellerUser();
        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'active']);
        $this->seedSentOrder($seller);

        // Finance : solde disponible et historique brut/commission/net.
        $this->actingAs($sellerUser, 'sanctum')
            ->getJson('/api/v1/seller/finances')
            ->assertOk()
            ->assertJsonStructure([
                'data' => ['balance', 'next_payout', 'last_payouts', 'transactions'],
            ])
            ->assertJsonPath('data.balance.available', 15000);

        // Retrait manuel Wave.
        $balanceBefore = $seller->balance->amount_available;
        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/payouts', ['amount_minor' => 10000])
            ->assertOk();

        $seller->balance->refresh();
        $this->assertSame($balanceBefore - 10000, (int) $seller->balance->amount_available);
        $this->assertDatabaseHas('seller_payouts', [
            'seller_id' => $seller->id,
            'status' => 'requested',
            'amount_minor' => 10000,
        ]);

        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/payouts', ['amount_minor' => 99999999])
            ->assertUnprocessable();

        // Analyse : CA, ventes par jour, top produits, fidélité, confiance.
        $response = $this->actingAs($sellerUser, 'sanctum')
            ->getJson('/api/v1/seller/analytics?period=30d')
            ->assertOk();

        $data = $response->json('data');
        $this->assertArrayHasKey('revenue', $data);
        $this->assertGreaterThan(0, $data['revenue']['amount_minor']);
        $this->assertArrayHasKey('variation_pct', $data['revenue']);
        $this->assertCount(30, $data['sales_per_day']);
        $this->assertNotEmpty($data['top_products']);
        $this->assertArrayHasKey('rate_pct', $data['repeat_customers']);
        $this->assertArrayHasKey('score', $data['trust']);
    }

    private function seedSentOrder(Seller $seller): void
    {
        $category = Category::query()->firstOrFail();
        $product = Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Article Analyse',
            'price_minor' => 15000,
            'stock_quantity' => 5,
        ]);

        $buyer = User::factory()->create();
        $buyer->assignRole(Role::Buyer);

        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/checkout', [
                'address' => ['address_line1' => 'Rue 1', 'city' => 'Yaoundé'],
                'payment_method' => 'cod',
                'shipping_approved' => true,
            ]);

        $order = Order::query()->latest('id')->firstOrFail();
        $this->actingAs($seller->user, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/accept');
        $this->actingAs($seller->user, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/ship');
        $this->actingAs($seller->user, 'sanctum')
            ->postJson('/api/v1/seller/orders/'.$order->order_number.'/delivered');
    }
}