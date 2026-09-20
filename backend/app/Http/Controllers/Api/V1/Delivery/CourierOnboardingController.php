<?php

namespace App\Http\Controllers\Api\V1\Delivery;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Inscription livreur en 4 étapes (phase 3) :
 *  1. Photo pièce d'identité + selfie
 *  2. Moyen de déplacement en icônes (à pied / moto / vélo)
 *  3. Zone de livraison sur une carte
 *  4. Coordonnées de paiement des courses
 * Puis validation sous 24h (SMS/appel vocal simulé) et bascule de
 * disponibilité en un geste.
 */
class CourierOnboardingController extends Controller
{
    public const STEPS = 4;

    public function progress(Request $request): JsonResponse
    {
        $courier = $this->courierOrFail($request);

        return response()->json([
            'data' => [
                'steps' => self::STEPS,
                'current_step' => (int) $courier->onboarding_step,
                'is_onboarded' => (bool) $courier->is_onboarded,
                'status' => $courier->status,
                'transport_type' => $courier->transport_type,
                'zone' => [
                    'lat' => $courier->zone_lat,
                    'lng' => $courier->zone_lng,
                    'radius_km' => $courier->zone_radius_km,
                    'address' => $courier->zone_address,
                ],
                'payout' => [
                    'method' => $courier->payout_method,
                    'account' => $courier->payout_account,
                ],
                'available' => (bool) $courier->available,
                'approved' => $courier->status === 'approved',
                'review_hours' => (int) config('delivery.review_hours', 24),
            ],
        ]);
    }

    public function step(Request $request, int $step): JsonResponse
    {
        if ($step < 2 || $step > self::STEPS) {
            abort(404);
        }

        $courier = $this->courierOrFail($request);

        switch ($step) {
            case 2:
                $data = $request->validate(['transport_type' => ['required', 'in:foot,moto,bike']]);
                $courier->forceFill(['transport_type' => $data['transport_type']])->save();
                break;

            case 3:
                $data = $request->validate([
                    'zone_lat' => ['required', 'numeric', 'between:-90,90'],
                    'zone_lng' => ['required', 'numeric', 'between:-180,180'],
                    'zone_radius_km' => ['required', 'integer', 'between:1,200'],
                    'zone_address' => ['nullable', 'string', 'max:190'],
                ]);
                $courier->forceFill([
                    'zone_lat' => $data['zone_lat'],
                    'zone_lng' => $data['zone_lng'],
                    'zone_radius_km' => $data['zone_radius_km'],
                    'zone_address' => $data['zone_address'] ?? null,
                ])->save();
                break;

            case 4:
                $data = $request->validate([
                    'payout_method' => ['required', 'in:wave,orange,bank'],
                    'payout_account' => ['required', 'string', 'max:190'],
                ]);
                $courier->forceFill([
                    'payout_method' => $data['payout_method'],
                    'payout_account' => $data['payout_account'],
                ])->save();
                break;
        }

        $courier->forceFill([
            'onboarding_step' => max((int) $courier->onboarding_step, $step),
        ])->save();

        if ($courier->onboarding_step >= self::STEPS && ! $courier->is_onboarded) {
            $courier->forceFill([
                'is_onboarded' => true,
                'status' => 'pending',
            ])->save();

            \App\Models\Notification::create([
                'user_id' => $courier->user_id,
                'type' => 'delivery.pending_review',
                'title' => 'Demande d\'inscription reçue',
                'message' => 'Vous recevrez une confirmation par SMS ou appel vocal sous 24 h.',
                'data' => [],
                'priority' => 'normal',
            ]);

            AuditService::log(AuditEvent::VerificationSubmitted, $courier);
        }

        return response()->json([
            'message' => $this->stepFeedback($step),
            'data' => [
                'current_step' => (int) $courier->fresh()->onboarding_step,
                'is_onboarded' => (bool) $courier->fresh()->is_onboarded,
                'status' => $courier->fresh()->status,
                'next_step' => $courier->is_onboarded ? null : ((int) $courier->onboarding_step + 1),
            ],
        ]);
    }

    public function step1(Request $request): JsonResponse
    {
        $courier = $this->courierOrFail($request);

        $validated = $request->validate([
            'identity_photo' => ['required', 'image', 'max:6144'],
            'selfie' => ['required', 'image', 'max:6144'],
        ]);

        $identityPath = $request->file('identity_photo')->store('couriers/identity', 'public');
        $selfiePath = $request->file('selfie')->store('couriers/selfies', 'public');

        $courier->forceFill([
            'identity_photo_path' => $identityPath,
            'selfie_path' => $selfiePath,
            'onboarding_step' => max((int) $courier->onboarding_step, 1),
        ])->save();

        return response()->json([
            'message' => 'Documents reçus.',
            'data' => [
                'current_step' => (int) $courier->onboarding_step,
                'next_step' => 2,
            ],
        ]);
    }

    /**
     * "Je suis disponible maintenant" — un geste, ordre / hors service.
     */
    public function availability(Request $request): JsonResponse
    {
        $courier = $this->courierOrFail($request);

        if ($courier->status !== 'approved') {
            throw ValidationException::withMessages([
                'available' => ['Votre inscription n\'a pas encore été validée.'],
            ]);
        }

        $validated = $request->validate(['available' => ['required', 'boolean']]);

        $courier->forceFill(['available' => (bool) $validated['available']])->save();

        return response()->json([
            'message' => $courier->available ? 'Vous êtes disponible. Bonne route !' : 'Vous êtes hors service.',
            'data' => ['available' => (bool) $courier->available],
        ]);
    }

    private function stepFeedback(int $step): string
    {
        return match ($step) {
            2 => 'Moyen de déplacement choisi.',
            3 => 'Zone de livraison enregistrée.',
            4 => 'Inscription envoyée ! Vous recevrez une confirmation sous 24 h.',
            default => 'Enregistré.',
        };
    }

    private function courierOrFail(Request $request)
    {
        $courier = $request->user()->courier;

        if ($courier === null) {
            throw ValidationException::withMessages([
                'profile' => ['Choisissez d\'abord le profil Livreur.'],
            ]);
        }

        return $courier;
    }
}