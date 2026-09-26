<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Seller;
use App\Models\SellerTransaction;
use App\Services\CommissionService;
use App\Services\PayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Tableau de bord financier du vendeur (phase 3) :
 * solde disponible, prochain versement automatique, historique des
 * transactions (brut / commission / net) et retrait manuel Wave.
 */
class SellerFinanceController extends Controller
{
    public function __construct(
        private readonly PayoutService $payouts,
        private readonly CommissionService $commission,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');
        $balance = $seller->balance()->firstOrCreate(['currency' => $seller->currency]);

        $transactions = $seller->transactions()
            ->with(['order'])
            ->orderByDesc('created_at')
            ->paginate(15);

        return response()->json([
            'data' => [
                'balance' => [
                    'available' => (int) $balance->amount_available,
                    'pending' => (int) $balance->amount_pending,
                    'currency' => $balance->currency,
                ],
                'commission' => [
                    'rate_bps' => $this->commission->rateBpsFor($seller),
                    'rate_pct' => round($this->commission->rateBpsFor($seller) / 100, 1),
                    'monthly_volume' => $this->commission->monthlyVolumeMinor($seller),
                    'tiers' => array_map(fn ($tier) => [
                        'min' => (int) ($tier['min'] ?? 0),
                        'rate_pct' => round((int) ($tier['bps'] ?? 0) / 100, 1),
                    ], $this->commission->tiers()),
                ],
                'next_payout' => $this->payouts->nextScheduled($seller),
                'last_payouts' => $seller->payouts()
                    ->orderByDesc('created_at')
                    ->limit(3)
                    ->get()
                    ->map(fn ($p) => [
                        'id' => $p->id,
                        'amount' => (int) $p->amount_minor,
                        'method' => $p->method,
                        'status' => $p->status,
                        'requested_at' => $p->requested_at?->toIso8601String(),
                    ]),
                'payout_method' => $seller->payout_method,
                'summary' => $this->accountingSummary($seller),
                'by_month' => $this->monthlyBreakdown($seller),
                'transactions' => collect($transactions->items())->map(fn ($t) => [
                    'id' => $t->id,
                    'type' => $t->type,
                    'direction' => $t->direction,
                    'amount' => (int) $t->amount_minor,
                    'commission' => (int) $t->commission_minor,
                    'fee' => (int) $t->fee_minor,
                    'net' => (int) $t->net_minor,
                    'order_number' => $t->order?->order_number,
                    'description' => $t->description,
                    'created_at' => $t->created_at?->toIso8601String(),
                ])->values(),
                'meta' => [
                    'current_page' => $transactions->currentPage(),
                    'last_page' => $transactions->lastPage(),
                    'total' => $transactions->total(),
                ],
            ],
        ]);
    }

    /**
     * Synthèse comptable (grand-livre) du vendeur : chiffre d'affaires brut,
     * commissions, frais, net des ventes, encours de séquestre, retraits et
     * résultat net de trésorerie. Uniquement dérivé des écritures, jamais
     * recalculé à la volée à partir du solde.
     */
    private function accountingSummary(Seller $seller): array
    {
        $total = function (string $type, ?string $direction, string $column = 'amount_minor') use ($seller): int {
            $q = SellerTransaction::query()
                ->where('seller_id', $seller->getKey())
                ->where('type', $type);

            if ($direction !== null) {
                $q->where('direction', $direction);
            }

            return (int) $q->sum($column);
        };

        $salesGross = $total('sale', 'in');
        $commissions = $total('sale', 'in', 'commission_minor');
        $fees = $total('sale', 'in', 'fee_minor');
        $netSales = $total('sale', 'in', 'net_minor');
        $payouts = $total('payout', 'out');
        $payoutFees = $total('payout', 'out', 'fee_minor');
        $reversals = $total('payout_reversal', 'out');

        return [
            'sales_count' => (int) SellerTransaction::query()
                ->where('seller_id', $seller->getKey())
                ->where('type', 'sale')
                ->count(),
            'sales_gross' => $salesGross,
            'commissions' => $commissions,
            'fees' => $fees,
            'net_sales' => $netSales,
            'released_escrow' => $total('release', 'in'),
            'payouts' => $payouts,
            'payout_fees' => $payoutFees,
            'payout_reversals' => $reversals,
            'net_cash' => $netSales - $payouts - $payoutFees + $reversals,
        ];
    }

    /**
     * Répartition mensuelle des ventes (6 derniers mois), agrégée en base.
     *
     * @return array<int, array<string, mixed>>
     */
    private function monthlyBreakdown(Seller $seller, int $months = 6): array
    {
        return SellerTransaction::query()
            ->where('seller_id', $seller->getKey())
            ->where('type', 'sale')
            ->where('created_at', '>=', now()->subMonths($months - 1)->startOfMonth())
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month')
            ->selectRaw('COUNT(*) as sales_count')
            ->selectRaw('SUM(amount_minor) as gross')
            ->selectRaw('SUM(commission_minor) as commissions')
            ->selectRaw('SUM(fee_minor) as fees')
            ->selectRaw('SUM(net_minor) as net')
            ->groupBy('month')
            ->orderByDesc('month')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->month,
                'sales_count' => (int) $row->sales_count,
                'gross' => (int) $row->gross,
                'commissions' => (int) $row->commissions,
                'fees' => (int) $row->fees,
                'net' => (int) $row->net,
            ])
            ->values()
            ->all();
    }

    public function payout(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $validated = $request->validate([
            'amount_minor' => ['required', 'integer', 'min:1'],
            'method' => ['nullable', 'in:wave,orange,bank'],
        ]);

        $method = $validated['method'] ?? $seller->payout_method ?? 'wave';

        try {
            $payout = $this->payouts->request($seller, (int) $validated['amount_minor'], $method);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['amount_minor' => [$e->getMessage()]]);
        }

        $balance = $seller->balance()->firstOrCreate(['currency' => $seller->currency]);

        return response()->json([
            'message' => 'Retrait demandé. L\'argent arrivera sur votre '.strtoupper($method).'.',
            'data' => [
                'payout' => [
                    'id' => $payout->id,
                    'amount' => (int) $payout->amount_minor,
                    'method' => $payout->method,
                    'status' => $payout->status,
                ],
                'balance' => [
                    'available' => (int) $balance->amount_available,
                    'pending' => (int) $balance->amount_pending,
                ],
            ],
        ]);
    }
}