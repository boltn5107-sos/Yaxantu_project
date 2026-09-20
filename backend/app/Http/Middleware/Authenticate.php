<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

/**
 * Version API-safe du middleware d'authentification.
 *
 * Les requêtes concernant l'API ne doivent JAMAIS tenter de rediriger vers
 * une route HTML `login` : elles lèvent une AuthenticationException qui sera
 * rendue en JSON (statut 401), quel que soit l'en-tête Accept.
 */
class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        return route('login');
    }
}