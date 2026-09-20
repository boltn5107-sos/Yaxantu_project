<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\SellerPayout;
use App\Services\PayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Supervision des versements des vendeurs : approbation, paiement et rejet
 * (actions réservées à l'administration via la permission payouts.manage).
 */
class AdminSellerPayoutController extends Controller
{
    public function __construct(private readonly PayoutService $payouts) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:requested,approved,paid,rejected'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = SellerPayout::query()->with([
            'seller:id,shop_name,slug,user_id,currency',
        ]);

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = '%'.$validated['search'].'%';
            $query->whereHas('seller', fn ($s) => $s->where('shop_name', 'like', $search));
        }

        $items = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $items->map(fn (SellerPayout $p) => [
                'id' => $p->id,
                'seller' => $p->seller ? [
                    'id' => $p->seller->id,
                    'shop_name' => $p->seller->shop_name,
                    'slug' => $p->seller->slug,
                    'currency' => $p->seller->currency,
                ] : null,
                'amount' => (int) $p->amount_minor,
                'currency' => $p->currency,
                'method' => $p->method,
                'status' => $p->status,
                'requested_at' => $p->requested_at?->toIso8601String(),
                'created_at' => $p->created_at?->toIso8601String(),
                'processed_at' => $p->processed_at?->toIso8601String(),
                'reference' => $p->transaction_id,
                'notes' => $p->notes,
            ]),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function approve(Request $request, SellerPayout $payout): JsonResponse
    {
        try {
            $this->payouts->approve($payout, $request->user());
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['payout' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Retrait approuvé, prêt au paiement.']);
    }

    public function pay(Request $request, SellerPayout $payout): JsonResponse
    {
        $validated = $request->validate([
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $this->payouts->markPaid($payout, $request->user(), $validated['reference'] ?? null);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['payout' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Retrait marqué payé.']);
    }

    public function reject(Request $request, SellerPayout $payout): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->payouts->reject($payout, $request->user(), $validated['reason'] ?? null);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages(['payout' => [$e->getMessage()]]);
        }

        return response()->json(['message' => 'Retrait rejeté et solde recrédité.']);
    }
}