<?php

namespace App\Models;

use App\Enums\Role as AppRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'referral_code',
        'sponsor_id',
        'phone_verified_at',
        'password',
        'locale',
        'avatar_path',
        'status',
        'pin_hash',
        'biometric_enabled',
        'voice_mode',
        'large_text',
        'helper_mode',
        'notify_voice',
        'notify_sms',
        'notify_inapp',
        'profile_choice_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'pin_hash',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'profile_choice_at' => 'datetime',
            'biometric_enabled' => 'boolean',
            'voice_mode' => 'boolean',
            'large_text' => 'boolean',
            'helper_mode' => 'boolean',
            'notify_voice' => 'boolean',
            'notify_sms' => 'boolean',
            'notify_inapp' => 'boolean',
        ];
    }

    // ---------------------------------------------------- Relations

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function seller(): HasOne
    {
        return $this->hasOne(Seller::class);
    }

    public function courier(): HasOne
    {
        return $this->hasOne(Courier::class);
    }

    public function biometricCredentials(): HasMany
    {
        return $this->hasMany(BiometricCredential::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function sponsor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sponsor_id');
    }

    public function referralsAsSponsor(): HasMany
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    // ---------------------------------------------------- Accès rôles

    protected function isActive(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->status === UserStatus::Active->value,
        );
    }

    public function hasRole(AppRole|string ...$roles): bool
    {
        $needles = array_map(
            fn (AppRole|string $role) => $role instanceof AppRole ? $role->value : $role,
            $roles,
        );

        return $this->roles->contains(fn (Role $role) => in_array($role->slug, $needles, true));
    }

    public function assignRole(AppRole|string $role): void
    {
        $slug = $role instanceof AppRole ? $role->value : $role;

        if ($this->hasRole($slug)) {
            return;
        }

        $this->roles()->attach(Role::where('slug', $slug)->firstOrFail());
        $this->unsetRelation('roles');
    }

    public function removeRole(AppRole|string $role): void
    {
        $slug = $role instanceof AppRole ? $role->value : $role;
        $this->roles()->detach(Role::where('slug', $slug)->first());
        $this->unsetRelation('roles');
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(AppRole::Admin);
    }

    public function isModerator(): bool
    {
        return $this->hasRole(AppRole::Moderator);
    }

    public function isSeller(): bool
    {
        return $this->hasRole(AppRole::Seller) && $this->seller !== null;
    }

    public function isBuyer(): bool
    {
        return $this->hasRole(AppRole::Buyer);
    }

    public function isCourier(): bool
    {
        return $this->hasRole(AppRole::Delivery) && $this->courier !== null;
    }

    public function hasPin(): bool
    {
        return filled($this->pin_hash);
    }

    /**
     * Profil principal pour l'UX (cartes visuelles de choix de profil) :
     * livreur / vendeur / acheteur, dans cet ordre de priorité.
     */
    public function profileType(): string
    {
        if ($this->hasRole(AppRole::Delivery)) {
            return 'delivery';
        }

        if ($this->hasRole(AppRole::Seller)) {
            return 'seller';
        }

        return 'buyer';
    }

    /**
     * Choix de profil encore nécessaire après une connexion par téléphone :
     * l'utilisateur n'a que le rôle acheté et aucun profil métier créé.
     */
    public function needsProfileChoice(): bool
    {
        if ($this->hasRole(AppRole::Seller) || $this->hasRole(AppRole::Delivery)) {
            return false;
        }

        return $this->seller === null && $this->courier === null;
    }

    // ---------------------------------------------------- Permissions

    /**
     * Vérifie une permission agrégée sur tous les rôles.
     * Le joker '*' (admin) autorise tout.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->status !== UserStatus::Active->value) {
            return false;
        }

        $allowed = $this->permissions();

        return $allowed->contains($permission) || $allowed->contains('*');
    }

    /**
     * @return Collection<int, string>
     */
    public function permissions(): Collection
    {
        $matrix = config('access.roles');

        return collect($this->roles)
            ->flatMap(fn (Role $role) => $matrix[$role->slug]['permissions'] ?? [])
            ->push('profile.manage')
            ->values()
            ->unique();
    }

    public function roleSlugs(): array
    {
        return $this->roles->pluck('slug')->all();
    }
}