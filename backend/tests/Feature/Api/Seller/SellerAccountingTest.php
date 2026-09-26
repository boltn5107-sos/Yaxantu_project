<?php

namespace Tests\Feature\Api\Seller;

use App\Enums\Role;
use App\Models\Seller;
use App\Models\SellerTransaction;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class SellerAccountingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    private function sellerUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole(Role::Seller);

        return $user;
    }

    private function sellerFor(User $user): Seller
    {
        return Seller::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
            'is_onboarded' => true,
        ]);
    }

    private function sale(Seller $seller, int $gross, int $commission, int $fee, $at): void
    {
        $transaction = new SellerTransaction([
            'seller_id' => $seller->id,
            'type' => 'sale',
            'direction' => 'in',
            'amount_minor' => $gross,
            'commission_minor' => $commission,
            'fee_minor' => $fee,
            'net_minor' => $gross - $commission - $fee,
            'description' => 'Vente test',
        ]);
        $transaction->timestamps = false;
        $transaction->created_at = $at;
        $transaction->save();
    }

    public function test_accounting_report_is_derived_from_real_data(): void
    {
        $user = $this->sellerUser();
        $seller = $this->sellerFor($user);

        $this->sale($seller, 50000, 2500, 500, now()->subDay());
        $this->sale($seller, 1000, 0, 0, now()->subDays(40));

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/expenses', [
                'amount_minor' => 10000,
                'category' => 'supplies',
                'incurred_at' => now()->toDateString(),
                'description' => 'Achat de stock',
            ])
            ->assertCreated()
            ->assertJsonPath('data.expense.amount_minor', 10000);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/seller/accounting?from='.now()->startOfMonth()->toDateString().'&to='.now()->toDateString());

        $response->assertOk();

        // La vente hors fenêtre (40 jours) est exclue, la dépense est retenue.
        $response->assertJsonPath('data.summary.sales_count', 1);
        $response->assertJsonPath('data.summary.sales_gross', 50000);
        $response->assertJsonPath('data.summary.commissions', 2500);
        $response->assertJsonPath('data.summary.fees', 500);
        $response->assertJsonPath('data.summary.net_sales', 47000);
        $response->assertJsonPath('data.summary.expenses', 10000);
        $response->assertJsonPath('data.summary.benefit', 37000);

        // Ventes détaillées + dépenses par catégorie.
        $response->assertJsonCount(1, 'data.sales');
        $response->assertJsonPath('data.sales.0.net', 47000);
        $response->assertJsonPath('data.expenses_by_category.0.category', 'supplies');
        $response->assertJsonCount(1, 'data.expenses');
    }

    public function test_expense_receipt_is_uploaded_and_deleted(): void
    {
        $user = $this->sellerUser();
        $seller = $this->sellerFor($user);

        $this->actingAs($user, 'sanctum')
            ->post('/api/v1/seller/expenses', [
                'amount_minor' => 5000,
                'category' => 'transport',
                'incurred_at' => now()->toDateString(),
                'receipt' => UploadedFile::fake()->image('recu.png'),
            ])
            ->assertCreated()
            ->assertJsonPath('data.expense.category', 'transport')
            ->assertJsonPath('data.expense.receipt_url', fn ($url) => is_string($url) && str_contains($url, 'expenses'));

        $expense = $seller->expenses()->firstOrFail();

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/seller/expenses/{$expense->id}")
            ->assertOk();

        $this->assertDatabaseMissing('seller_expenses', ['id' => $expense->id]);
    }

    public function test_goal_can_be_saved_and_progress_uses_monthly_turnover(): void
    {
        $user = $this->sellerUser();
        $seller = $this->sellerFor($user);
        $this->sale($seller, 30000, 1500, 0, now()->startOfMonth()->addDay());

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/seller/goal', ['monthly_minor' => 60000])
            ->assertOk();

        $this->assertSame(60000, (int) $seller->fresh()->monthly_goal_minor);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/seller/accounting')
            ->assertOk()
            ->assertJsonPath('data.goal.monthly_minor', 60000)
            ->assertJsonPath('data.goal.achieved_minor', 30000)
            ->assertJsonPath('data.goal.progress_pct', 50);
    }

    public function test_expense_category_must_be_valid(): void
    {
        $user = $this->sellerUser();
        $this->sellerFor($user);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/seller/expenses', [
                'amount_minor' => 1000,
                'category' => 'vacances',
                'incurred_at' => now()->toDateString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }
}