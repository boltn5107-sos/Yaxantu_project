<?php

namespace App\Providers;

use App\Models\User;
use App\Services\ConfigService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ConfigService::class);
    }

    public function boot(): void
    {
        $this->registerGates();
        $this->registerRateLimiters();
        $this->registerPasswordResetUrl();
    }

    /**
     * Le lien de réinitialisation pointe vers le frontend Next.js
     * (le backend reste une API pure, sans route HTML).
     */
    private function registerPasswordResetUrl(): void
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');

        ResetPassword::createUrlUsing(
            fn (User $notifiable, string $token): string => $frontendUrl.'/auth/reset-password?token='.$token.'&email='.$notifiable->getEmailForPasswordReset(),
        );
    }

    private function registerRateLimiters(): void
    {
        RateLimiter::for('health', fn (): Limit => Limit::perMinute(60));
        RateLimiter::for('otp', fn (): Limit => Limit::perMinute(5)->by(request()?->user()?->id ?: request()?->ip()));
        RateLimiter::for('visual-search', fn (): Limit => Limit::perMinute(30)->by(request()?->ip()));
    }

    /**
     * Enregistre une Gate dynamique par permission déclarée dans config/access.php.
     * Table(['perm' => fn (User $user) => $user->hasPermission('perm')]).
     */
    private function registerGates(): void
    {
        $permissions = config('access.permissions', []);

        foreach (array_keys($permissions) as $permission) {
            Gate::define($permission, fn (User $user): bool => $user->hasPermission($permission));
        }

        // L'administrateur passe toutes les vérifications de permission.
        Gate::before(fn (User $user): ?bool => $user->isAdmin() ? true : null);
    }
}
