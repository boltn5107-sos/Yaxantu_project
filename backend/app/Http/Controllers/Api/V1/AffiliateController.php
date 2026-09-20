<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Affiliate;
use App\Services\AffiliateService;
use App\Services\ConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Espace influenceur (programme d'affiliation).
 *
 * Sécurité : le solde, le taux et les plafonds sont toujours recalculés côté
 * serveur ; les demandes de retrait sont débitées du solde disponible puis
 * soumises à la validation d'un administrateur.
 */
class AffiliateController extends Controller
{
    public function __construct(
        private readonly AffiliateService $affiliates,
        private readonly ConfigService $config,
    ) {}

    /**
     * Mon espace : profil, code, solde, statistiques et historique.
     */
    public function index(Request $request): JsonResponse
    {
        $affiliate = Affiliate::query()
            ->where('user_id', $request->user()->getKey())
            ->first();

        if ($affiliate === null) {
            return response()->json(['data' => null]);
        }

        $code = $affiliate->promoCodes()->latest('id')->first();
        $balance = $this->affiliates->balance($affiliate);

        $commissions = $affiliate->commissions()
            ->with('order:id,order_number')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'order_number' => $c->order?->order_number,
                'base_amount' => (int) $c->base_amount_minor,
                'rate_pct' => round($c->rate_bps / 100, 1),
                'amount' => (int) $c->amount_minor,
                'status' => $c->status,
                'created_at' => $c->created_at?->toIso8601String(),
            ]);

        $payouts = $affiliate->payouts()
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'amount' => (int) $p->amount_minor,
                'method' => $p->method,
                'status' => $p->status,
                'requested_at' => $p->requested_at?->toIso8601String(),
                'paid_at' => $p->paid_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => [
                'affiliate' => [
                    'id' => $affiliate->id,
                    'handle' => $affiliate->handle,
                    'public_name' => $affiliate->public_name,
                    'status' => $affiliate->status,
                    'is_active' => $affiliate->isActive(),
                    'commission_rate_pct' => round($this->affiliates->rateBpsFor($affiliate) / 100, 1),
                    'monthly_cap' => $affiliate->monthly_cap_minor,
                    'payout_method' => $affiliate->payout_method,
                    'payout_account' => $this->affiliates->maskAccount($affiliate->payout_account),
                    'approved_at' => $affiliate->approved_at?->toIso8601String(),
                ],
                'code' => $code !== null ? [
                    'code' => $code->code,
                    'discount_type' => $code->discount_type,
                    'discount_value' => (int) $code->discount_value,
                    'min_order' => $code->min_order_minor,
                    'max_discount_per_order' => $code->max_discount_per_order_minor,
                    'max_uses' => $code->max_uses,
                    'used_count' => (int) $code->used_count,
                    'expires_at' => $code->expires_at?->toIso8601String(),
                ] : null,
                'balance' => [
                    'available' => (int) $balance->amount_available,
                    'pending' => (int) $balance->amount_pending,
                    'currency' => $balance->currency,
                ],
                'stats' => $this->affiliates->stats($affiliate),
                'payout_rules' => [
                    'min_amount' => $this->config->affiliatePayoutMinimum(),
                    'max_amount' => $this->config->affiliatePayoutMaximum(),
                    'methods' => ['mobile_money', 'wave', 'bank'],
                ],
                'commissions' => $commissions,
                'payouts' => $payouts,
            ],
        ]);
    }

    /**
     * Candidature au programme influenceur (crée un profil "draft").
     */
    public function apply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'handle' => ['required', 'string', 'min:3', 'max:80', 'regex:/^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$/'],
            'public_name' => ['nullable', 'string', 'max:120'],
            'motivation' => ['nullable', 'string', 'max:1000'],
            'payout_method' => ['nullable', 'in:mobile_money,wave,bank'],
            'payout_account' => ['nullable', 'string', 'max:100'],
            'payout_email' => ['nullable', 'email', 'max:150'],
        ]);

        $validated['handle'] = strtolower($validated['handle']);

        try {
            $affiliate = $this->affiliates->apply($request->user(), $validated);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['handle' => [$e->getMessage()]]);
        }

        return response()->json([
            'message' => 'Candidature envoyée. Un administrateur va l\'examiner.',
            'data' => [
                'id' => $affiliate->id,
                'handle' => $affiliate->handle,
                'status' => $affiliate->status,
            ],
        ], 201);
    }

    /**
     * Demande de retrait des gains accumulés (validation admin requise).
     */
    public function requestPayout(Request $request): JsonResponse
    {
        $affiliate = Affiliate::query()
            ->where('user_id', $request->user()->getKey())
            ->firstOrFail();

        $validated = $request->validate([
            'amount_minor' => ['required', 'integer', 'min:1'],
            'method' => ['nullable', 'in:mobile_money,wave,bank'],
        ]);

        $method = $validated['method'] ?? $affiliate->payout_method ?? 'mobile_money';

        try {
            $payout = $this->affiliates->requestPayout($affiliate, (int) $validated['amount_minor'], $method);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['amount_minor' => [$e->getMessage()]]);
        }

        $balance = $this->affiliates->balance($affiliate);

        return response()->json([
            'message' => 'Retrait demandé. Il sera traité après validation.',
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