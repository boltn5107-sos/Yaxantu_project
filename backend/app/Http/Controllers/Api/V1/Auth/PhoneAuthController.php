<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\AuditEvent;
use App\Enums\Role;
use App\Http\Controllers\Api\V1\Controller;
use App\Http\Resources\UserResource;
use App\Models\Courier;
use App\Models\Seller;
use App\Services\AuditService;
use App\Services\OtpService;
use App\Services\TrustScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Authentification par numéro de téléphone uniquement (phase 3).
 *
 * Pas d'email ni de mot de passe : on envoie un code par SMS, l'utilisateur le
 * tape ou l'écoute à voix haute (lecture vocale côté client), puis il choisit
 * son profil avec des cartes visuelles (Acheteur / Vendeur / Livreur).
 */
class PhoneAuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otp,
        private readonly TrustScoreService $trust,
    ) {}

    /**
     * Demande un code de connexion pour un numéro de téléphone.
     */
    public function requestCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'device_id' => ['nullable', 'string', 'max:190'],
        ]);

        $phone = $this->otp->normalize($validated['phone']);

        $result = $this->otp->send($phone);

        return response()->json([
            'message' => 'Code envoyé par SMS (et disponible à l\'écoute vocale).',
            'phone' => $phone,
            'expires_in_seconds' => $result['expires_in_seconds'],
            'dev_code' => $result['dev_code'],
        ]);
    }

    /**
     * Vérifie le code et connecte l'utilisateur (création si nouveau).
     */
    public function verifyCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'code' => ['required', 'string', 'size:6'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $phone = $this->otp->normalize($validated['phone']);

        if (! $this->otp->verify($phone, $validated['code'])) {
            throw ValidationException::withMessages([
                'code' => ['Code incorrect ou expiré.'],
            ]);
        }

        $user = $this->otp->userForPhone($phone);

        if (isset($validated['name']) && trim((string) $validated['name']) !== '') {
            $user->forceFill(['name' => trim($validated['name'])])->save();
        }

        $user->forceFill(['phone_verified_at' => $user->phone_verified_at ?? now()])->save();

        auth()->login($user);
        $request->session()->regenerate();

        AuditService::log(AuditEvent::LoggedIn, $user, ['method' => 'phone_otp']);

        return (new UserResource($user->load('roles', 'seller', 'courier')))
            ->additional(['message' => 'Connexion réussie.'],)
            ->response();
    }

    /**
     * Choix du profil après connexion : Acheteur / Vendeur / Livreur.
     */
    public function chooseProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:buyer,seller,delivery'],
        ]);

        $user = $request->user();

        match ($validated['type']) {
            'buyer' => $user->assignRole(Role::Buyer),
            'seller' => $this->ensureSeller($user),
            'delivery' => $this->ensureCourier($user),
        };

        $user->forceFill(['profile_choice_at' => now()])->save();

        AuditService::log(AuditEvent::RoleChanged, $user, ['profile' => $validated['type']]);

        return (new UserResource($user->load('roles', 'seller', 'courier')))
            ->additional(['message' => 'Profil enregistré.'])->response();
    }

    private function ensureSeller($user): void
    {
        if ($user->seller !== null) {
            $user->assignRole(Role::Seller);

            return;
        }

        $seller = Seller::create([
            'user_id' => $user->id,
            'shop_name' => 'Ma boutique',
            'slug' => 'boutique-'.$user->id.'-'.Str::lower(Str::random(4)),
            'status' => 'draft',
            'currency' => 'XOF',
        ]);

        $user->setRelation('seller', $seller);
        $user->assignRole(Role::Seller);

        $this->bootTrustScore($seller);
    }

    private function ensureCourier($user): void
    {
        if ($user->courier !== null) {
            $user->assignRole(Role::Delivery);

            return;
        }

        $courier = Courier::create([
            'user_id' => $user->id,
            'status' => 'draft',
        ]);

        $user->setRelation('courier', $courier);
        $user->assignRole(Role::Delivery);
    }

    /**
     * Score de confiance de départ à l'ouverture de la boutique.
     */
    private function bootTrustScore(Seller $seller): void
    {
        if ($seller->trust_score > 0) {
            return;
        }

        $this->trust->apply($seller, 20, 'Ouverture de votre boutique : votre score part de 20.');
    }

    /**
     * Option parrainage : un vendeur actif valide un nouveau vendeur.
     */
    public function sponsor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sponsor_phone' => ['required', 'string', 'max:30'],
        ]);

        $user = $request->user();

        if ($user->seller === null || $user->seller->is_onboarded) {
            throw new RuntimeException('Le parrainage s\'applique pendant la création de boutique.');
        }

        $sponsor = Seller::query()
            ->whereHas('user', fn ($q) => $q->where('phone', $this->otp->normalize($validated['sponsor_phone'])))
            ->where('status', 'active')
            ->first();

        if ($sponsor === null) {
            throw ValidationException::withMessages([
                'sponsor_phone' => ['Aucun vendeur actif trouvé pour ce numéro.'],
            ]);
        }

        $user->seller->forceFill(['sponsor_id' => $sponsor->id])->save();

        $this->trust->apply($user->seller, 15, 'Validé par un vendeur actif ('.($sponsor->shop_name ?: $sponsor->slug).'). +15 points de confiance.');

        return response()->json([
            'message' => 'Parrainage pris en compte. Votre niveau de confiance de départ est plus élevé.',
            'sponsor' => ['shop_name' => $sponsor->shop_name, 'slug' => $sponsor->slug],
        ]);
    }
}