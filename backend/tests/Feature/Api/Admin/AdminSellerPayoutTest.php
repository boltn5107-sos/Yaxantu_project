<?php

namespace Tests\Feature\Api\Admin;

use App\Enums\Role;
use App\Models\Seller;
use App\Models\SellerBalance;
use App\Models\SellerPayout;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSellerPayoutTest extends TestCase
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

    private function buyer(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Buyer);

        return $user;
    }

    private function requestedPayout(): array
    {
        $sellerUser = User::factory()->create();
        $sellerUser->assignRole(Role::Seller);

        $seller = Seller::factory()->create(['user_id' => $sellerUser->id, 'status' => 'active']);

        SellerBalance::create([
            'seller_id' => $seller->id,
            'currency' => $seller->currency,
            'amount_available' => 15000,
            'amount_pending' => 0,
        ]);

        $this->actingAs($sellerUser, 'sanctum')
            ->postJson('/api/v1/seller/payouts', ['amount_minor' => 10000, 'method' => 'wave'])
            ->assertOk();

        $payout = SellerPayout::query()->latest('id')->firstOrFail();

        return ['payout' => $payout, 'seller' => $seller];
    }

    public function test_admin_lists_seller_payouts(): void
    {
        ['payout' => $payout] = $this->requestedPayout();

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/payouts')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $payout->id)
            ->assertJsonPath('data.0.status', 'requested');
    }

    public function test_admin_approves_and_marks_paid(): void
    {
        ['payout' => $payout] = $this->requestedPayout();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/payouts/'.$payout->id.'/approve')
            ->assertOk();

        $payout->refresh();
        $this->assertSame('approved', $payout->status);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/payouts/'.$payout->id.'/pay', ['reference' => 'TRAN-2026'])
            ->assertOk();

        $payout->refresh();
        $this->assertSame('paid', $payout->status);
        $this->assertSame('TRAN-2026', $payout->transaction_id);
        $this->assertNotNull($payout->processed_at);
    }

    public function test_admin_rejects_and_credits_balance_back(): void
    {
        ['payout' => $payout, 'seller' => $seller] = $this->requestedPayout();

        $balanceBefore = $seller->balance()->first()->amount_available;

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/payouts/'.$payout->id.'/reject', [
                'reason' => 'Compte de retrait invalide.',
            ])
            ->assertOk();

        $payout->refresh();
        $this->assertSame('rejected', $payout->status);

        $balance = $seller->balance()->first()->refresh();
        $this->assertSame($balanceBefore + 10000, (int) $balance->amount_available);

        $this->assertDatabaseHas('seller_transactions', [
            'seller_id' => $seller->id,
            'type' => 'payout_reversal',
            'direction' => 'in',
            'amount_minor' => 10000,
        ]);
    }

    public function test_unapproved_payout_cannot_be_paid(): void
    {
        ['payout' => $payout] = $this->requestedPayout();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/payouts/'.$payout->id.'/pay')
            ->assertUnprocessable();
    }

    public function test_approved_payout_cannot_be_rejected(): void
    {
        ['payout' => $payout] = $this->requestedPayout();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/payouts/'.$payout->id.'/approve');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/admin/payouts/'.$payout->id.'/reject')
            ->assertUnprocessable();
    }

    public function test_buyer_cannot_supervise_payouts(): void
    {
        $this->actingAs($this->buyer(), 'sanctum')
            ->getJson('/api/v1/admin/payouts')
            ->assertForbidden();
    }
}