<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Controllers\Api\V1\Controller;
use App\Http\Resources\UserResource;
use App\Models\BiometricCredential;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Sécurité (paramètres) : code PIN 4 chiffres et déverrouillage biométrique.
 *
 * La biométrie WebAuthn passe par le navigateur/téléphone natif ; le serveur
 * gère les défis (challenge) et l'enregistrement des credentials. La promesse
 * de vérification cryptographique de la signature nécessite un jeton de type
 * web-auth/webauthn-lib en production ; ici la structure est validée (les
 * paquets sont décodables et le challenge correspond), comme le webhook de
 * paiement est simulé localement.
 */
class SecurityController extends Controller
{
    public function updatePin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pin' => ['required', 'digits:4'],
            'pin_confirmation' => ['required', 'same:pin'],
        ]);

        $request->user()->forceFill([
            'pin_hash' => Hash::make($validated['pin']),
        ])->save();

        return response()->json(['message' => 'Code PIN enregistré.']);
    }

    public function verifyPin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pin' => ['required', 'digits:4'],
        ]);

        $user = $request->user();

        if (! $user->hasPin()) {
            throw ValidationException::withMessages([
                'pin' => ['Aucun code PIN n\'est enregistré.'],
            ]);
        }

        if (! Hash::check($validated['pin'], $user->pin_hash)) {
            throw ValidationException::withMessages([
                'pin' => ['Code PIN incorrect.'],
            ]);
        }

        return response()->json(['message' => 'Code PIN vérifié.', 'verified' => true]);
    }

    /**
     * Émet un défi pour l'enregistrement (credential_id null) ou le
     * déverrouillage (credential_id fourni) d'un credential WebAuthn.
     */
    public function biometricChallenge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'credential_id' => ['nullable', 'string', 'max:512'],
        ]);

        $challenge = base64_encode(random_bytes(32));

        $credentialId = $request->input('credential_id');

        if (filled($credentialId)) {
            $key = 'biometric.unlock.'.$credentialId;
        } else {
            $key = 'biometric.register.'.$request->user()->id;
        }

        Cache::put($key, $challenge, now()->addMinutes(3));

        return response()->json([
            'challenge' => $challenge,
            'rp' => parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost',
            'timeout' => 60000,
        ]);
    }

    /**
     * Enregistre un credential WebAuthn créé par le navigateur (empreinte /
     * visage) après une authentification réussie.
     */
    public function biometricRegister(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'credential_id' => ['required', 'string', 'max:512'],
            'public_key' => ['required', 'string'],
            'platform' => ['nullable', 'string', 'max:40'],
            'client_data_json' => ['required', 'string'],
        ]);

        $user = $request->user();

        $issued = Cache::get('biometric.register.'.$user->id);

        if (! $this->clientChallengeMatches($validated['client_data_json'], $issued)) {
            throw ValidationException::withMessages([
                'client_data_json' => ['Défi invalide ou expiré.'],
            ]);
        }

        $credential = BiometricCredential::create([
            'user_id' => $user->id,
            'credential_id' => $validated['credential_id'],
            'public_key' => $validated['public_key'],
            'platform' => $validated['platform'] ?? 'web',
        ]);

        $user->forceFill(['biometric_enabled' => true])->save();

        Cache::forget('biometric.register.'.$user->id);

        return (new UserResource($user->load('roles')))
            ->additional(['message' => 'Déverrouillage biométrique activé.'])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Déverrouillage : l'utilisateur a prouvé sa présence (empreinte/visage)
     * sur son appareil via navigator.credentials.get(). On vérifie la forme.
     */
    public function biometricUnlock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'credential_id' => ['required', 'string', 'max:512'],
            'client_data_json' => ['required', 'string'],
            'authenticator_data' => ['required', 'string'],
            'signature' => ['required', 'string'],
        ]);

        $credential = BiometricCredential::query()
            ->where('credential_id', $validated['credential_id'])
            ->first();

        if ($credential === null) {
            throw ValidationException::withMessages([
                'credential_id' => ['Matériel non reconnu.'],
            ]);
        }

        $issued = Cache::get('biometric.unlock.'.$credential->credential_id);

        if (! $this->clientChallengeMatches($validated['client_data_json'], $issued)) {
            throw ValidationException::withMessages([
                'signature' => ['Défi invalide ou expiré.'],
            ]);
        }

        foreach (['client_data_json', 'authenticator_data', 'signature'] as $field) {
            if (! $this->isBase64Url($validated[$field])) {
                throw ValidationException::withMessages([
                    $field => ['Donnée biométrique invalide.'],
                ]);
            }
        }

        Cache::forget('biometric.unlock.'.$credential->credential_id);

        $user = $credential->user;
        \Illuminate\Support\Facades\Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return (new UserResource($user->load('roles', 'seller', 'courier')))
            ->additional(['message' => 'Bienvenue !'])->response();
    }

    public function securityOverview(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'biometric_enabled' => (bool) $user->biometric_enabled,
            'biometric_devices' => $user->biometricCredentials()->get()->map(fn ($c) => [
                'id' => $c->id,
                'platform' => $c->platform,
                'created_at' => $c->created_at?->toIso8601String(),
            ]),
            'pin_configured' => $user->hasPin(),
        ]);
    }

    private function clientChallengeMatches(string $clientDataJson, ?string $issued): bool
    {
        if ($issued === null) {
            return false;
        }

        $decoded = json_decode(base64_decode(Str::remove('=', $clientDataJson)), true);

        return is_array($decoded) && ($decoded['challenge'] ?? null) === $issued;
    }

    private function isBase64Url(string $value): bool
    {
        $decoded = base64_decode(Str::remove('=', $value), true);

        return $decoded !== false && strlen($decoded) > 0;
    }
}