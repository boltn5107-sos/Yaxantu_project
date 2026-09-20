<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Affiliate;
use App\Models\AffiliateCommission;
use App\Models\AffiliatePayout;
use App\Models\User;
use App\Services\AffiliateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Console de pilotage du programme influenceurs.
 *
 * L'administrateur contrôle les sommes : taux et plafonds par influenceur,
 * approbation de chaque commission, validation et paiement de chaque retrait.
 */
class AdminAffiliateController extends Controller
{
    public function __construct(private readonly AffiliateService $affiliates) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:draft,active,suspended'],
            'q' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Affiliate::query()->with(['user:id,name,email', 'balance']);

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['q'])) {
            $query->where(function ($q) use ($validated) {
                $q->where('handle', 'like', '%'.$validated['q'].'%')
                    ->orWhere('public_name', 'like', '%'.$validated['q'].'%')
                    ->orWhereHas('user', fn ($u) => $u->where('email', 'like', '%'.$validated['q'].'%'));
            });
        }

        $affiliates = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $affiliates->map(fn (Affiliate $affiliate) => [
                'id' => $affiliate->id,
                'handle' => $affiliate->handle,
                'public_name' => $affiliate->public_name,
                'status' => $affiliate->status,
                'user' => [
                    'name' => $affiliate->user?->name,
                    'email' => $affiliate->user?->email,
                ],
                'commission_rate_pct' => round($this->affiliates->rateBpsFor($affiliate) / 100, 1),
                'monthly_cap_minor' => $affiliate->monthly_cap_minor,
                'balance' => [
                    'available' => (int) optional($affiliate->balance)->amount_available,
                    'pending' => (int) optional($affiliate->balance)->amount_pending,
                ],
                'code' => $affiliate->promoCodes()->latest('id')->value('code'),
                'approved_at' => $affiliate->approved_at?->toIso8601String(),
                'created_at' => $affiliate->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $affiliates->currentPage(),
                'last_page' => $affiliates->lastPage(),
                'per_page' => $affiliates->perPage(),
                'total' => $affiliates->total(),
            ],
        ]);
    }

    public function show(Affiliate $affiliate): JsonResponse
    {
        $affiliate->load(['user:id,name,email,phone', 'commissions', 'payouts']);
        $code = $affiliate->promoCodes()->latest('id')->first();

        return response()->json([
            'data' => [
                'id' => $affiliate->id,
                'handle' => $affiliate->handle,
                'public_name' => $affiliate->public_name,
                'status' => $affiliate->status,
                'motivation' => $affiliate->motivation,
                'note' => $affiliate->note,
                'user' => $affiliate->user ? [
                    'id' => $affiliate->user->id,
                    'name' => $affiliate->user->name,
                    'email' => $affiliate->user->email,
                    'phone' => $affiliate->user->phone,
                ] : null,
                'commission_rate_bps' => $affiliate->commission_rate_bps,
                'commission_rate_pct' => round($this->affiliates->rateBpsFor($affiliate) / 100, 1),
                'monthly_cap_minor' => $affiliate->monthly_cap_minor,
                'payout_method' => $affiliate->payout_method,
                'payout_account' => $affiliate->payout_account,
                'payout_email' => $affiliate->payout_email,
                'approved_at' => $affiliate->approved_at?->toIso8601String(),
                'code' => $code !== null ? [
                    'id' => $code->id,
                    'code' => $code->code,
                    'discount_type' => $code->discount_type,
                    'discount_value' => (int) $code->discount_value,
                    'is_fixed' => $code->isFixed(),
                    'min_order_minor' => $code->min_order_minor,
                    'max_discount_per_order_minor' => $code->max_discount_per_order_minor,
                    'per_user_limit' => $code->per_user_limit,
                    'max_discount_total_minor' => $code->max_discount_total_minor,
                    'max_uses' => $code->max_uses,
                    'used_count' => (int) $code->used_count,
                    'total_discount_granted_minor' => $code->totalDiscountGranted(),
                    'is_active' => (bool) $code->is_active,
                    'expires_at' => $code->expires_at?->toIso8601String(),
                ] : null,
                'balance' => (fn () => $balance = $this->affiliates->balance($affiliate))(),
                'stats' => $this->affiliates->stats($affiliate),
            ],
        ]);
    }

    /**
     * Création directe par l'admin : lie un compte utilisateur et active.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateAffiliate($request);
        $user = $this->resolveUser($request);

        try {
            $affiliate = Affiliate::create([
                'user_id' => $user->id,
                'handle' => $validated['handle'],
                'public_name' => $validated['public_name'] ?? null,
                'status' => 'draft',
                'commission_rate_bps' => $validated['commission_rate_bps'] ?? null,
                'monthly_cap_minor' => $validated['monthly_cap_minor'] ?? null,
                'payout_method' => $validated['payout_method'] ?? null,
                'payout_account' => $validated['payout_account'] ?? null,
                'payout_email' => $validated['payout_email'] ?? null,
                'note' => $validated['note'] ?? null,
            ]);

            $this->affiliates->activate($affiliate, $this->promoPayload($request), $request->user());
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['user_id' => [$e->getMessage()]]);
        }

        return response()->json([
            'message' => 'Influenceur créé et son code promo activé.',
            'data' => ['id' => $affiliate->id],
        ], 201);
    }

    /**
     * Mise à jour des réglages (taux, plafonds, statut, versement).
     */
    public function update(Request $request, Affiliate $affiliate): JsonResponse
    {
        $validated = $this->validateAffiliate($request, $affiliate);

        $this->affiliates->updateSettings($affiliate, collect($validated)->only([
            'public_name',
            'commission_rate_bps',
            'monthly_cap_minor',
            'payout_method',
            'payout_account',
            'payout_email',
            'note',
        ])->toArray());

        if (isset($validated['status']) && $validated['status'] !== $affiliate->status) {
            $this->affiliates->setStatus($affiliate, $validated['status'], $request->user());
        }

        $promo = $this->promoPayload($request);
        if ($affiliate->isActive() && ($promo['code'] ?? null) !== null) {
            $code = $affiliate->promoCodes()->latest('id')->first();
            $code?->forceFill([
                'code' => strtoupper($promo['code']),
                'discount_type' => $promo['discount_type'],
                'discount_value' => $promo['discount_value'],
                'max_discount_per_order_minor' => $promo['max_discount_per_order_minor'] ?? null,
                'per_user_limit' => $promo['per_user_limit'] ?? null,
                'max_discount_total_minor' => $promo['max_discount_total_minor'] ?? null,
            ])->save();
        }

        return response()->json(['message' => 'Influenceur mis à jour.']);
    }

    /**
     * Activation d'une candidature avec son code promo paramétré.
     */
    public function activate(Request $request, Affiliate $affiliate): JsonResponse
    {
        $promo = $this->validatePromo($request, $affiliate);

        try {
            $this->affiliates->activate($affiliate, $promo, $request->user());
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['status' => [$e->getMessage()]]);
        }

        return response()->json([
            'message' => 'Candidature activée. Le code promo est maintenant utilisable.',
        ]);
    }

    // ── Commissions ─────────────────────────────────────────────────────

    public function commissions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,approved,reversed'],
            'affiliate_id' => ['nullable', 'integer', 'exists:affiliates,id'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = AffiliateCommission::query()->with([
            'affiliate:id,handle,public_name',
            'order:id,order_number,user_id',
        ]);

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['affiliate_id'])) {
            $query->where('affiliate_id', $validated['affiliate_id']);
        }

        $items = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $items->map(fn (AffiliateCommission $c) => [
                'id' => $c->id,
                'affiliate' => [
                    'id' => $c->affiliate?->id,
                    'handle' => $c->affiliate?->handle,
                    'public_name' => $c->affiliate?->public_name,
                ],
                'order_number' => $c->order?->order_number,
                'base_amount' => (int) $c->base_amount_minor,
                'rate_pct' => round($c->rate_bps / 100, 1),
                'amount' => (int) $c->amount_minor,
                'status' => $c->status,
                'created_at' => $c->created_at?->toIso8601String(),
                'approved_at' => $c->approved_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function approveCommission(Request $request, AffiliateCommission $commission): JsonResponse
    {
        try {
            $this->affiliates->approveCommission($commission, $request->user());
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['commission' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Commission approuvée et créditée sur le solde disponible.']);
    }

    public function reverseCommission(Request $request, AffiliateCommission $commission): JsonResponse
    {
        $this->affiliates->reverseCommission($commission);

        return response()->json(['message' => 'Commission annulée.']);
    }

    // ── Retraits ────────────────────────────────────────────────────────

    public function payouts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:requested,approved,paid,rejected'],
            'affiliate_id' => ['nullable', 'integer', 'exists:affiliates,id'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = AffiliatePayout::query()->with(['affiliate:id,handle,public_name']);

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['affiliate_id'])) {
            $query->where('affiliate_id', $validated['affiliate_id']);
        }

        $items = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $items->map(fn (AffiliatePayout $p) => [
                'id' => $p->id,
                'affiliate' => [
                    'id' => $p->affiliate?->id,
                    'handle' => $p->affiliate?->handle,
                    'public_name' => $p->affiliate?->public_name,
                ],
                'amount' => (int) $p->amount_minor,
                'method' => $p->method,
                'account' => $p->account,
                'status' => $p->status,
                'requested_at' => $p->requested_at?->toIso8601String(),
                'approved_at' => $p->approved_at?->toIso8601String(),
                'paid_at' => $p->paid_at?->toIso8601String(),
                'reference' => $p->reference,
                'note' => $p->note,
            ]),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function approvePayout(Request $request, AffiliatePayout $payout): JsonResponse
    {
        try {
            $this->affiliates->approvePayout($payout, $request->user());
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['payout' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Retrait approuvé.']);
    }

    public function payPayout(Request $request, AffiliatePayout $payout): JsonResponse
    {
        $validated = $request->validate([
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $this->affiliates->payPayout($payout, $request->user(), $validated['reference'] ?? null);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['payout' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Retrait marqué payé.']);
    }

    public function rejectPayout(Request $request, AffiliatePayout $payout): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->affiliates->rejectPayout($payout, $request->user(), $validated['reason'] ?? null);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['payout' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Retrait rejeté et solde recrédité.']);
    }

    // ── Validations ─────────────────────────────────────────────────────

    private function validateAffiliate(Request $request, ?Affiliate $ignore = null): array
    {
        $rules = [
            'user_id' => [$ignore === null ? 'nullable' : 'prohibited', 'integer', 'exists:users,id'],
            'email' => [$ignore === null ? 'nullable' : 'prohibited', 'email', 'exists:users,email'],
            'handle' => $ignore === null
                ? ['required', 'string', 'min:3', 'max:80', 'regex:/^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$/', Rule::unique('affiliates', 'handle')]
                : ['prohibited'],
            'public_name' => ['nullable', 'string', 'max:120'],
            'commission_rate_bps' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'monthly_cap_minor' => ['nullable', 'integer', 'min:0'],
            'payout_method' => ['nullable', 'in:mobile_money,wave,bank'],
            'payout_account' => ['nullable', 'string', 'max:100'],
            'payout_email' => ['nullable', 'email', 'max:150'],
            'note' => ['nullable', 'string', 'max:1000'],
            'status' => ['nullable', 'in:draft,active,suspended'],
        ];

        return $request->validate($rules);
    }

    private function promoRules(Request $request, ?Affiliate $ignore = null): array
    {
        $unique = Rule::unique('promo_codes', 'code');
        if ($ignore !== null && $ignore->promoCodes()->exists()) {
            $unique->ignore($ignore->promoCodes()->latest('id')->value('id'));
        }

        $percentRule = function ($attribute, $value, $fail) use ($request) {
            if ($request->input('discount_type') === 'percent' && (int) $value > 100) {
                $fail('Une réduction en pourcentage ne peut pas dépasser 100 %.');
            }
        };

        return [
            'code' => ['nullable', 'string', 'max:40', 'regex:/^[A-Z0-9_.-]+$/', $unique],
            'discount_type' => ['nullable', 'in:percent,fixed'],
            'discount_value' => ['nullable', 'integer', 'min:1', $percentRule],
            'max_discount_per_order_minor' => ['nullable', 'integer', 'min:0'],
            'per_user_limit' => ['nullable', 'integer', 'min:1'],
            'max_discount_total_minor' => ['nullable', 'integer', 'min:0'],
        ];
    }

    private function validatePromo(Request $request, ?Affiliate $affiliate = null): array
    {
        return $request->validate($this->promoRules($request, $affiliate));
    }

    private function promoPayload(Request $request): array
    {
        return $request->validate($this->promoRules($request));
    }

    private function resolveUser(Request $request): User
    {
        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'email' => ['nullable', 'email', 'exists:users,email'],
        ]);

        $query = User::query();

        if (! empty($validated['user_id'])) {
            $query->whereKey($validated['user_id']);
        } elseif (! empty($validated['email'])) {
            $query->where('email', $validated['email']);
        } else {
            throw ValidationException::withMessages([
                'user_id' => ['Indiquez un utilisateur (id ou email) pour cet influenceur.'],
            ]);
        }

        $user = $query->firstOrFail();
        $current = Affiliate::query()->where('user_id', $user->id)->exists();

        if ($current) {
            throw ValidationException::withMessages([
                'user_id' => ['Cet utilisateur a déjà un profil influenceur.'],
            ]);
        }

        return $user;
    }
}