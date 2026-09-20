<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\AuditEvent;
use App\Enums\Role;
use App\Http\Controllers\Api\V1\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Inscription + auto-login (cookie SPA).
     *
     * Le nouveau compte reçoit automatiquement le rôle buyer.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
        ]);

        $user->assignRole(Role::Buyer);

        AuditService::log(AuditEvent::Registered, $user);

        $promos = app(\App\Services\PromoService::class);
        $promos->ensureCode($user);

        if (! empty($data['ref'])) {
            $promos->registerReferral($user, $data['ref']);
        }

        auth()->login($user);
        $request->session()->regenerate();

        return (new UserResource($user->load('roles', 'seller', 'courier', 'affiliate')))
            ->additional(['message' => 'Inscription réussie.'])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Connexion SPA (cookie httpOnly + session).
     *
     * Le client doit d'abord récupérer le XSRF-TOKEN via GET /sanctum/csrf-cookie
     * puis envoyer le header X-XSRF-TOKEN avec cette requête.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (! auth()->attempt($credentials, $request->boolean('remember'))) {
            AuditService::log(AuditEvent::LoggedIn, null, [
                'email' => $request->email,
                'success' => false,
            ]);

            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        $user = auth()->user();

        if ($user->status !== 'active') {
            auth()->logout();
            $request->session()->invalidate();

            throw ValidationException::withMessages([
                'email' => ['Compte suspendu ou banni.'],
            ]);
        }

        $request->session()->regenerate();

        AuditService::log(AuditEvent::LoggedIn, $user);

        return (new UserResource($user->load('roles', 'seller', 'courier', 'affiliate')))
            ->additional(['message' => 'Connexion réussie.'])
            ->response();
    }

    /**
     * Déconnexion + invalidation session.
     */
    public function logout(Request $request): JsonResponse
    {
        AuditService::log(AuditEvent::LoggedOut);

        $user = $request->user();

        // Jeton Sanctum (clients non-SPA avec Bearer token). En mode SPA, le
        // user vient de la session et currentAccessToken() est un TransientToken.
        $currentToken = $user?->currentAccessToken();
        if ($currentToken instanceof \Laravel\Sanctum\PersonalAccessToken) {
            $currentToken->delete();
        }

        // Session SPA (cookie httpOnly).
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Reconstruit les gardes : aucun utilisateur ne reste authentifié.
        auth()->forgetGuards();

        return response()->json([
            'message' => 'Déconnecté.',
        ]);
    }

    /**
     * Utilisateur courant (déjà authentifié via session/cookie).
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('roles', 'seller', 'courier', 'affiliate'));
    }
}
