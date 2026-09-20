<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Referral;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReferralController extends Controller
{
    /**
     * Parrainages : suivi des invitations et des récompenses versées.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,rewarded'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Referral::query()
            ->with(['referrer:id,name,email,referral_code', 'referredUser:id,name,email', 'promoCode:id,code']);

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $referrals = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $referrals->map(fn (Referral $referral) => [
                'id' => $referral->id,
                'status' => $referral->status,
                'referrer' => $referral->referrer ? [
                    'name' => $referral->referrer->name,
                    'email' => $referral->referrer->email,
                    'code' => $referral->referrer->referral_code,
                ] : null,
                'referred_user' => $referral->referredUser ? [
                    'name' => $referral->referredUser->name,
                    'email' => $referral->referredUser->email,
                ] : null,
                'reward_code' => $referral->promoCode?->code,
                'created_at' => $referral->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $referrals->currentPage(),
                'last_page' => $referrals->lastPage(),
                'per_page' => $referrals->perPage(),
                'total' => $referrals->total(),
            ],
        ]);
    }
}