<?php

namespace Tests\Feature\Api\Marketing;

use App\Enums\Role;
use App\Models\Affiliate;
use App\Models\AffiliateBalance;
use App\Models\AffiliateCommission;
use App\Models\AffiliatePayout;
use App\Models\Category;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\Seller;
use App\Models\User;
use App\Services\AffiliateService;
use Database\Seeders\CategorySeeder;
use Database\Seeders\MarketingSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AffiliateTest extends TestCase
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

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Admin);

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

    private function product(Seller $seller, int $price, int $stock = 20): Product
    {
        $category = Category::where('slug', 'electronique')->first();

        return Product::factory()->create([
            'seller_id' => $seller->id,
            'category_id' => $category?->id,
            'name' => 'Article Influenceur',
            'price_minor' => $price,
            'stock_quantity' => $stock,
        ]);
    }

    private function activate(User $affiliateUser, array $promo = []): Affiliate
    {
        $affiliate = app(AffiliateService::class)->apply($affiliateUser, [
            'handle' => 'super-creat',
            'public_name' => 'Super Créateur',
        ]);

        return app(AffiliateService::class)->activate(
            $affiliate,
            array_merge([
                'discount_type' => 'percent',
                'discount_value' => 10,
            ], $promo),
            $this->admin(),
        );
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
            ],
            'payment_method' => 'cod',
            'shipping_approved' => true,
        ];
    }

    private function placeOrder(User $buyer, Seller $seller, Product $product, ?string $promoCode = null): \Illuminate\Testing\TestResponse
    {
        $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/cart/items', ['product_id' => $product->id, 'quantity' => 1]);

        return $this->actingAs($buyer, 'sanctum')
            ->postJson('/api/v1/checkout', array_merge($this->addressPayload(), $promoCode ? ['promo_code' => $promoCode] : []));
    }

    public function test_affiliate_index_is_null_without_application(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')
            ->getJson('/api/v1/affiliate')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_apply_creates_draft_affiliate(): void
    {
        $user = $this->buyer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/affiliate/apply', [
                'handle' => 'Mon-Univers',
                'motivation' => 'Je veux promouvoir vos produits.',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('affiliates', [
            'user_id' => $user->id,
            'handle' => 'mon-univers',
            'status' => 'draft',
        ]);
    }

    public function test_apply_is_singular_per_user(): void
    {
        $user = $this->buyer();

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/affiliate/apply', ['handle' => 'Premier'])->assertCreated();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/affiliate/apply', ['handle' => 'Second'])->assertStatus(422);
    }

    public function test_admin_activation_creates_promo_code(): void
    {
        $user = $this->buyer();

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/affiliate/apply', ['handle' => 'studio'])->assertCreated();

        $affiliate = Affiliate::where('user_id', $user->id)->firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/affiliates/'.$affiliate->id.'/activate', [
                'discount_type' => 'percent',
                'discount_value' => 12,
            ])
            ->assertOk();

        $this->assertDatabaseHas('affiliates', ['id' => $affiliate->id, 'status' => 'active']);
        $this->assertDatabaseHas('promo_codes', [
            'affiliate_id' => $affiliate->id,
            'discount_value' => 12,
            'is_active' => true,
        ]);
        $this->assertNotNull($affiliate->fresh()->approved_at);
    }

    public function test_non_admin_cannot_write_affiliate(): void
    {
        $user = $this->buyer();
        $affiliate = app(AffiliateService::class)->apply($user, ['handle' => 'compte']);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/admin/affiliates/'.$affiliate->id, ['note' => 'piratage'])
            ->assertForbidden();
    }

    public function test_influencer_cannot_use_own_code(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, ['code' => 'MONCODE1']);
        $code = $affiliate->promoCodes()->first()->code;

        $seller = $this->seller();
        $product = $this->product($seller, 10000);

        $this->placeOrder($influencer, $seller, $product, $code)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Vous ne pouvez pas utiliser votre propre code de parrainage.');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_with_influencer_code_applies_capped_discount(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, [
            'code' => 'CAP500',
            'max_discount_per_order_minor' => 500,
        ]);

        $buyer = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 10000);

        $response = $this->placeOrder($buyer, $seller, $product, 'CAP500');

        $response->assertCreated()
            ->assertJsonPath('data.0.subtotal', 10000)
            // 10 % théorique = 1000, plafonné à 500 par commande.
            ->assertJsonPath('data.0.discount', 500);

        $this->assertDatabaseHas('orders', ['discount_minor' => 500, 'promo_code_id' => $affiliate->promoCodes()->first()->id]);
    }

    public function test_per_user_limit_is_enforced(): void
    {
        $this->activate($this->buyer(), ['code' => 'USELIM', 'per_user_limit' => 1]);

        $buyer = $this->buyer();
        $seller = $this->seller();
        $product = $this->product($seller, 10000);

        $this->placeOrder($buyer, $seller, $product, 'USELIM')->assertCreated();

        $this->placeOrder($buyer, $seller, $product, 'USELIM')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Vous avez déjà utilisé ce code le nombre de fois autorisé.');
    }

    public function test_delivery_records_pending_commission(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, ['code' => 'COMM40']);
        $seller = $this->seller();
        $buyer = $this->buyer();
        $product = $this->product($seller, 10000);

        $response = $this->placeOrder($buyer, $seller, $product, 'COMM40');
        $response->assertCreated();
        $orderNumber = $response->json('data.0.order_number');

        $sellerUser = $seller->user;
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/accept')->assertOk();
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/ship')->assertOk();
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/delivered')->assertOk();

        // Base = sous-total - remise (10 000 - 1 000) ; commission 5 % par défaut = 450.
        $this->assertDatabaseHas('affiliate_commissions', [
            'affiliate_id' => $affiliate->id,
            'status' => 'pending',
            'amount_minor' => 450,
            'rate_bps' => 500,
        ]);

        $this->assertDatabaseHas('affiliate_balances', [
            'affiliate_id' => $affiliate->id,
            'amount_pending' => 450,
            'amount_available' => 0,
        ]);
    }

    public function test_admin_approval_moves_commission_to_available(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, ['code' => 'OKCOM']);
        $seller = $this->seller();
        $buyer = $this->buyer();
        $product = $this->product($seller, 10000);

        $response = $this->placeOrder($buyer, $seller, $product, 'OKCOM');
        $orderNumber = $response->json('data.0.order_number');
        $sellerUser = $seller->user;
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/accept')->assertOk();
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/ship')->assertOk();
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/delivered')->assertOk();

        $commission = AffiliateCommission::where('affiliate_id', $affiliate->id)->firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/affiliate-commissions/'.$commission->id.'/approve')
            ->assertOk();

        $this->assertDatabaseHas('affiliate_commissions', ['id' => $commission->id, 'status' => 'approved']);
        $this->assertDatabaseHas('affiliate_balances', [
            'affiliate_id' => $affiliate->id,
            'amount_pending' => 0,
            'amount_available' => 450,
        ]);
    }

    public function test_payout_flow_request_approve_pay(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, ['payout_account' => '066000000']);
        AffiliateBalance::create(['affiliate_id' => $affiliate->id, 'amount_available' => 2000]);

        $this->actingAs($influencer, 'sanctum')
            ->postJson('/api/v1/affiliate/payouts', ['amount_minor' => 1500, 'method' => 'mobile_money'])
            ->assertOk()
            ->assertJsonPath('data.payout.status', 'requested')
            ->assertJsonPath('data.balance.available', 500);

        $this->assertDatabaseHas('affiliate_balances', [
            'affiliate_id' => $affiliate->id,
            'amount_available' => 500,
        ]);

        $payout = AffiliatePayout::where('affiliate_id', $affiliate->id)->firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/affiliate-payouts/'.$payout->id.'/approve')
            ->assertOk();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/affiliate-payouts/'.$payout->id.'/pay', ['reference' => 'TX-123'])
            ->assertOk();

        $this->assertDatabaseHas('affiliate_payouts', [
            'id' => $payout->id,
            'status' => 'paid',
            'reference' => 'TX-123',
        ]);
    }

    public function test_payout_above_balance_is_rejected(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer);
        AffiliateBalance::create(['affiliate_id' => $affiliate->id, 'amount_available' => 100]);

        $this->actingAs($influencer, 'sanctum')
            ->postJson('/api/v1/affiliate/payouts', ['amount_minor' => 9999])
            ->assertStatus(422);
    }

    public function test_rejected_payout_credits_balance_back(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer);
        AffiliateBalance::create(['affiliate_id' => $affiliate->id, 'amount_available' => 3000]);

        $this->actingAs($influencer, 'sanctum')
            ->postJson('/api/v1/affiliate/payouts', ['amount_minor' => 1500])
            ->assertOk();

        $payout = AffiliatePayout::where('affiliate_id', $affiliate->id)->firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/affiliate-payouts/'.$payout->id.'/reject', ['reason' => 'Coordonnées invalides'])
            ->assertOk();

        $this->assertDatabaseHas('affiliate_payouts', ['id' => $payout->id, 'status' => 'rejected']);
        $this->assertDatabaseHas('affiliate_balances', [
            'affiliate_id' => $affiliate->id,
            'amount_available' => 3000,
        ]);
    }

    public function test_suspended_affiliate_code_is_deactivated(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, ['code' => 'SUSP0']);
        $seller = $this->seller();
        $buyer = $this->buyer();
        $product = $this->product($seller, 10000);

        app(AffiliateService::class)->setStatus($affiliate, 'suspended', $this->admin());

        $this->assertDatabaseHas('promo_codes', ['code' => 'SUSP0', 'is_active' => false]);

        $this->placeOrder($buyer, $seller, $product, 'SUSP0')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Ce code promo est invalide.');
    }

    public function test_admin_can_reverse_commission(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, ['code' => 'REV01']);
        $seller = $this->seller();
        $buyer = $this->buyer();
        $product = $this->product($seller, 10000);

        $response = $this->placeOrder($buyer, $seller, $product, 'REV01');
        $orderNumber = $response->json('data.0.order_number');
        $sellerUser = $seller->user;
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/accept')->assertOk();
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/ship')->assertOk();
        $this->actingAs($sellerUser, 'sanctum')->postJson('/api/v1/seller/orders/'.$orderNumber.'/delivered')->assertOk();

        $commission = AffiliateCommission::where('affiliate_id', $affiliate->id)->firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/affiliate-commissions/'.$commission->id.'/reverse')
            ->assertOk();

        $this->assertDatabaseHas('affiliate_commissions', ['id' => $commission->id, 'status' => 'reversed']);
        $this->assertDatabaseHas('affiliate_balances', [
            'affiliate_id' => $affiliate->id,
            'amount_pending' => 0,
            'amount_available' => 0,
        ]);
    }

    public function test_affiliate_space_returns_stats_and_code(): void
    {
        $influencer = $this->buyer();
        $affiliate = $this->activate($influencer, ['code' => 'ESPACE1']);

        $this->actingAs($influencer, 'sanctum')
            ->getJson('/api/v1/affiliate')
            ->assertOk()
            ->assertJsonPath('data.affiliate.status', 'active')
            ->assertJsonPath('data.code.code', 'ESPACE1')
            ->assertJsonStructure([
                'data' => [
                    'affiliate',
                    'code',
                    'balance' => ['available', 'pending', 'currency'],
                    'stats' => [
                        'orders_count',
                        'sales_minor',
                        'discount_granted_minor',
                        'commissions',
                    ],
                    'payout_rules',
                    'commissions',
                    'payouts',
                ],
            ]);
    }
}