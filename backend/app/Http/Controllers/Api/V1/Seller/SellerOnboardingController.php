<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Services\AuditService;
use App\Services\TrustScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Création de boutique en 5 étapes, une action par écran (phase 3) :
 *  1. Photo/logo (prise directe)
 *  2. Nom dicté à voix haute
 *  3. Catégorie principale en pictogrammes
 *  4. Localisation (épingle sur carte)
 *  5. Coordonnées de paiement pour recevoir l'argent
 *
 * Zéro jargon, zéro CGU : après l'étape 5, le vendeur est redirigé vers
 * "Ajouter votre premier produit" avec une confirmation sonore et visuelle.
 */
class SellerOnboardingController extends Controller
{
    public const STEPS = 5;

    public function __construct(
        private readonly TrustScoreService $trust,
    ) {}

    public function progress(Request $request): JsonResponse
    {
        $seller = $this->sellerOrFail($request);

        return response()->json([
            'data' => [
                'steps' => self::STEPS,
                'current_step' => (int) $seller->onboarding_step,
                'is_onboarded' => (bool) $seller->is_onboarded,
                'shop_name' => $seller->shop_name,
                'logo' => $seller->logo_path,
                'main_category_id' => $seller->main_category_id,
                'location' => [
                    'lat' => $seller->location_lat,
                    'lng' => $seller->location_lng,
                    'address' => $seller->location_address,
                ],
                'payout' => [
                    'method' => $seller->payout_method,
                    'account' => $seller->payout_account,
                ],
                'sponsor' => $seller->sponsor ? [
                    'shop_name' => $seller->sponsor->shop_name,
                    'slug' => $seller->sponsor->slug,
                ] : null,
                'trust_score' => (int) $seller->trust_score,
            ],
        ]);
    }

    public function step(Request $request, int $step): JsonResponse
    {
        if ($step < 2 || $step > self::STEPS) {
            abort(404);
        }

        $seller = $this->sellerOrFail($request);

        switch ($step) {
            case 2:
                $data = $this->validateStep2($request, $seller);
                $slug = Str::slug($data['shop_name']) ?: 'boutique-'.$seller->id;

                $seller->forceFill([
                    'shop_name' => $data['shop_name'],
                    'slug' => $this->uniqueSlug($slug, $seller),
                ])->save();
                break;

            case 3:
                $data = $request->validate(['main_category_id' => ['required', 'exists:categories,id']]);
                $seller->forceFill(['main_category_id' => $data['main_category_id']])->save();
                break;

            case 4:
                $data = $request->validate([
                    'location_lat' => ['required', 'numeric', 'between:-90,90'],
                    'location_lng' => ['required', 'numeric', 'between:-180,180'],
                    'location_address' => ['nullable', 'string', 'max:190'],
                ]);
                $seller->forceFill([
                    'location_lat' => $data['location_lat'],
                    'location_lng' => $data['location_lng'],
                    'location_address' => $data['location_address'] ?? null,
                ])->save();
                break;

            case 5:
                $data = $request->validate([
                    'payout_method' => ['required', 'in:wave,orange,bank'],
                    'payout_account' => ['required', 'string', 'max:190'],
                ]);
                $seller->forceFill([
                    'payout_method' => $data['payout_method'],
                    'payout_account' => $data['payout_account'],
                ])->save();
                break;
        }

        $seller->forceFill([
            'onboarding_step' => max((int) $seller->onboarding_step, $step),
        ])->save();

        if ($seller->onboarding_step >= self::STEPS) {
            $this->complete($seller);
        }

        return response()->json([
            'message' => $this->stepFeedback($step),
            'data' => [
                'current_step' => (int) $seller->fresh()->onboarding_step,
                'is_onboarded' => (bool) $seller->fresh()->is_onboarded,
                'next_step' => $seller->is_onboarded ? null : ((int) $seller->onboarding_step + 1),
            ],
        ]);
    }

    public function step1(Request $request): JsonResponse
    {
        $seller = $this->sellerOrFail($request);

        $validated = $request->validate([
            'logo' => ['required', 'image', 'max:4096'],
        ]);

        $path = $request->file('logo')->store('seller/logos', 'public');

        $seller->forceFill([
            'logo_path' => $path,
            'onboarding_step' => max((int) $seller->onboarding_step, 1),
        ])->save();

        return response()->json([
            'message' => 'Photo de la boutique enregistrée.',
            'data' => [
                'logo' => $path,
                'current_step' => (int) $seller->onboarding_step,
                'next_step' => 2,
            ],
        ]);
    }

    private function validateStep2(Request $request, $seller): array
    {
        return $request->validate([
            'shop_name' => ['required', 'string', 'min:2', 'max:80', 'unique:sellers,shop_name,'.$seller->id],
        ]);
    }

    private function uniqueSlug(string $slug, $seller): string
    {
        $candidate = $slug;
        $i = 0;

        while (\App\Models\Seller::query()
            ->where('slug', $candidate)
            ->where('id', '!=', $seller->id)
            ->exists()
        ) {
            $candidate = $slug.'-'.(++$i);
        }

        return $candidate;
    }

    private function complete($seller): void
    {
        if ($seller->is_onboarded) {
            return;
        }

        $seller->forceFill([
            'is_onboarded' => true,
            'status' => 'active',
            'onboarded_at' => now(),
        ])->save();

        $this->trust->apply($seller, 10, 'Boutique terminée : votre fiche est complète. +10 points de confiance.');

        \App\Models\Notification::create([
            'user_id' => $seller->user_id,
            'type' => 'seller.onboarded',
            'title' => 'Votre boutique est prête !',
            'message' => 'Ajoutez votre premier produit pour commencer à vendre.',
            'data' => [],
            'action_url' => '/seller/products/new',
            'action_text' => 'Ajouter mon premier produit',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::SellerCreated, $seller, ['steps' => self::STEPS]);
    }

    private function stepFeedback(int $step): string
    {
        return match ($step) {
            2 => 'Nom de la boutique enregistré.',
            3 => 'Catégorie choisie.',
            4 => 'Localisation enregistrée.',
            5 => 'Tout est prêt ! Votre boutique est ouverte.',
            default => 'Enregistré.',
        };
    }

    private function sellerOrFail(Request $request)
    {
        $seller = $request->user()->seller;

        if ($seller === null) {
            throw ValidationException::withMessages([
                'profile' => ['Choisissez d\'abord le profil Vendeur.'],
            ]);
        }

        return $seller;
    }
}