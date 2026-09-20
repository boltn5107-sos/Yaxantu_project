<?php

namespace App\Http\Controllers\Api\V1\Promo;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Referral;
use App\Services\PromoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function __construct(private readonly PromoService $promos) {}

    /**
     * Données de parrainage de l'utilisateur connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $code = $this->promos->ensureCode($user);

        $invited = Referral::query()
            ->where('referrer_id', $user->getKey())
            ->count();

        $rewards = Referral::query()
            ->where('referrer_id', $user->getKey())
            ->where('status', 'rewarded')
            ->with('promoCode')
            ->get()
            ->map(fn (Referral $referral) => $referral->promoCode?->code)
            ->filter()
            ->values()
            ->all();

        return response()->json([
            'data' => [
                'code' => $code,
                'link' => (config('cors.allowed_origins', ['http://localhost:3000'])[0]).'/auth/register?ref='.$code,
                'invited_count' => $invited,
                'reward_codes' => $rewards,
                'reward_message' => 'Recevez un bon de 1 000 FCFA dès que votre filleul passe sa première commande.',
            ],
        ]);
    }
}