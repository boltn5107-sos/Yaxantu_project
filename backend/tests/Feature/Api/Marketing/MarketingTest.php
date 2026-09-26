<?php

namespace Tests\Feature\Api\Marketing;

use App\Enums\Role;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\Referral;
use App\Models\Seller;
use App\Models\User;
use Database\Seeders\CategorySeeder;
use Database\Seeders\MarketingSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(CategorySeeder::class);
        $this->seed(MarketingSeeder::class);
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
        ]);
    }

    private function product(Seller $seller, string $name, int $price, int $stock = 20): Product
    {
        $category = Category::where('slug', 'electronique')->first();

        return Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => $name,
            'price_minor' => $price,
            'stock_quantity' => $stock,
        ]);
    }

    private function addressPayload(): array
    {
        return [
            'address' => [
                'first_name' => 'Awa',
                'last_name' => 'Diallo',
                'address_line1' => 'Rue Principale 12',
                'city' => 'Douala',
                'state_province' => 'Littoral',
                'country_code' => 'CM',
                'phone' => '691234567',
                'latitude' => 4.0511,
                'longitude' => 9.7679,
            ],
            'payment_method' => 'cod',
        ];
    }

    public function test_validate_promo_code_returns_discount(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')
            ->postJson('/api/v1/promo-codes/validate', [
                'code' => 'LAUNCH2026',
                'subtotal' => 10000,
            ])
            ->assertOk()
            ->assertJsonPath('data.code', 'LAUNCH2026')
            ->assertJsonPath('data.discount', 1000);
    }

    public function test_validate_invalid_promo_code_is_rejected(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')
            ->postJson('/api/v1/promo-codes/validate', ['code' => 'INCONNU'])
            ->assertStatus(422);
    }

    public function test_checkout_applies_promo_discount_and_counts_usage(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Smartphone', 10000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', array_merge($this->addressPayload(), [
                'promo_code' => 'LAUNCH2026',
                'shipping_approved' => true,
            ]));

        $response->assertCreated()
            ->assertJsonPath('data.0.subtotal', 10000)
            ->assertJsonPath('data.0.discount', 1000)
            ->assertJsonPath('data.0.shipping', 1000)
            ->assertJsonPath('data.0.total', 10000);

        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'discount_minor' => 1000,
            'total_minor' => 10000,
            'promo_code_id' => PromoCode::where('code', 'LAUNCH2026')->first()->id,
        ]);

        $this->assertDatabaseHas('promo_codes', [
            'code' => 'LAUNCH2026',
            'used_count' => 1,
        ]);
    }

    public function test_checkout_rejects_promo_below_minimum(): void
    {
        $user = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 'Petit Article', 1000);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/checkout', array_merge($this->addressPayload(), [
                'promo_code' => 'LAUNCH2026',
            ]))
            ->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_register_with_referral_links_sponsor(): void
    {
        $sponsor = $this->buyer();
        $sponsor->forceFill(['referral_code' => 'SPONSOR1'])->save();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Filleul',
            'email' => 'filleul@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'ref' => 'SPONSOR1',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'filleul@example.com',
            'sponsor_id' => $sponsor->id,
        ]);

        $this->assertNotEmpty(
            \DB::table('users')->where('email', 'filleul@example.com')->where('referral_code', 'like', 'YX-%')->value('referral_code'),
        );

        $this->assertDatabaseHas('referrals', [
            'referrer_id' => $sponsor->id,
            'status' => 'pending',
        ]);
    }

    public function test_first_order_rewards_sponsor_with_coupon(): void
    {
        $sponsor = $this->buyer();
        $sponsor->forceFill(['referral_code' => 'SPONSOR1'])->save();

        $filleul = $this->buyer();
        $filleul->forceFill(['referral_code' => 'YX-FILLEUL', 'sponsor_id' => $sponsor->id])->save();

        Referral::create([
            'referrer_id' => $sponsor->id,
            'referred_user_id' => $filleul->id,
            'status' => 'pending',
        ]);

        $seller = $this->seller();
        $product = $this->product($seller, 'Article', 10000);

        $this->actingAs($filleul, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        $response = $this->actingAs($filleul, 'sanctum')
            ->postJson('/api/v1/checkout', array_merge($this->addressPayload(), ['shipping_approved' => true]));
        $response->assertCreated();

        $this->assertDatabaseHas('referrals', [
            'referrer_id' => $sponsor->id,
            'status' => 'rewarded',
        ]);

        $this->assertDatabaseHas('promo_codes', [
            'description' => 'Récompense parrainage — a offert à '.$sponsor->email,
            'discount_type' => 'fixed',
            'discount_value' => 1000,
        ]);
    }

    public function test_referral_endpoint_returns_own_code(): void
    {
        $user = $this->buyer();
        $user->forceFill(['referral_code' => 'YX-MOI'])->save();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/referrals')
            ->assertOk()
            ->assertJsonPath('data.code', 'YX-MOI')
            ->assertJsonPath('data.reward_codes', []);
    }

    public function test_banners_index_returns_active_seeded(): void
    {
        $this->getJson('/api/v1/banners')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'title', 'subtitle', 'image', 'link'],
                ],
            ]);
    }
}