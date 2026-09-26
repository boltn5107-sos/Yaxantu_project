<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PhoneVerification;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Connexion par numéro de téléphone + code SMS (cahier des charges Phase 3).
 *
 * L'envoi SMS est simulé en développement : le code est renvoyé dans la
 * réponse (champ dev_code) et une notification "sms.out" est créée pour
 * rester traçable. En production, un prestataire SMS remplacerait la
 * notification ; la lecture à voix haute est faite côté client (Web Speech).
 */
class OtpService
{
    public const CODE_LENGTH = 6;

    public const TTL_SECONDS = 300;

    public const MAX_ATTEMPTS = 5;

    /**
     * Génère un code, le stocke haché et "envoie" le SMS (simulé).
     *
     * @return array{expires_in_seconds: int, dev_code: ?string}
     */
    public function send(string $phone): array
    {
        $phone = $this->normalize($phone);

        PhoneVerification::where('phone', $phone)
            ->whereNull('used_at')
            ->update(['used_at' => now()]);

        $code = (string) random_int(100000, 999999);
        $expiresAt = now()->addSeconds(self::TTL_SECONDS);

        PhoneVerification::create([
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'expires_at' => $expiresAt,
        ]);

        $user = User::query()->where('phone', $phone)->first();
        if ($user !== null) {
            Notification::create([
                'user_id' => $user->id,
                'type' => 'sms.out',
                'title' => 'Code de connexion',
                'message' => 'Votre code de connexion Taaba-taaba est '.$code.'. Sa lecture à voix haute est disponible dans l\'application.',
                'data' => ['dev_code' => app()->environment('local', 'testing') ? $code : null],
                'priority' => 'high',
            ]);
        }

        \Illuminate\Support\Facades\Log::channel('stack')->info('SMS simulé envoyé vers {phone}', [
            'phone' => $phone,
            'code' => app()->environment('local', 'testing') ? $code : null,
        ]);

        return [
            'expires_in_seconds' => self::TTL_SECONDS,
            'dev_code' => app()->environment('local', 'testing') ? $code : null,
        ];
    }

    /**
     * Vérifie le code saisi. Incrémente les tentatives, invalide après échec.
     */
    public function verify(string $phone, string $code): bool
    {
        $verification = PhoneVerification::query()
            ->where('phone', $this->normalize($phone))
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('id')
            ->first();

        if ($verification === null) {
            return false;
        }

        if ($verification->attempts >= self::MAX_ATTEMPTS) {
            $verification->forceFill(['used_at' => now()])->save();

            return false;
        }

        if (! Hash::check($code, $verification->code_hash)) {
            $verification->increment('attempts');

            return false;
        }

        $verification->forceFill(['used_at' => now()])->save();

        return true;
    }

    public function normalize(string $phone): string
    {
        $clean = Str::of($phone)->trim()->replace(' ', '')->replace('-', '');

        return (string) $clean;
    }

    /**
     * Compte ou crée l'utilisateur lié au numéro, sans mot de passe.
     */
    public function userForPhone(string $phone): User
    {
        $phone = $this->normalize($phone);

        $user = User::query()->where('phone', $phone)->first();

        if ($user !== null) {
            return $user;
        }

        $user = User::create([
            'name' => 'Client '.substr($phone, -4),
            'phone' => $phone,
            'phone_verified_at' => now(),
            'email' => null,
            'password' => null,
        ]);

        $user->assignRole(\App\Enums\Role::Buyer);

        return $user;
    }

    public function requireUser(string $phone): User
    {
        $user = User::query()->where('phone', $this->normalize($phone))->first();

        if ($user === null) {
            throw new RuntimeException('Aucun compte associé à ce numéro.');
        }

        return $user;
    }
}