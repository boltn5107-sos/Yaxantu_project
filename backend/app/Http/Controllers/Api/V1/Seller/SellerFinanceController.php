<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Api\V1\Controller;
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