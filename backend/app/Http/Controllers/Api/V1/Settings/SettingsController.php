<?php

namespace App\Http\Controllers\Api\V1\Settings;

use App\Http\Controllers\Api\V1\Controller;
use App\Services\PayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Paramètres regroupés et visuels (phase 3) :
 * Compte, Accessibilité, Notifications, Paiement, Sécurité, Assistance.
 */
class SettingsController extends Controller
{
    /** Langues disponibles, dont les langues locales camerounaises. */
    public const LANGUAGES = [
        ['code' => 'fr', 'label' => 'Français'],
        ['code' => 'en', 'label' => 'English'],
        ['code' => 'bam', 'label' => 'Bamiléké'],
        ['code' => 'ful', 'label' => 'Peulh (Fulfulde)'],
        ['code' => 'basa', 'label' => 'Basaa'],
        ['code' => 'ewondo', 'label' => 'Ewondo'],
        ['code' => 'dual', 'label' => 'Douala'],
        ['code' => 'kos', 'label' => 'Kossi (Musgum)'],
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $seller = $user->seller;

        return response()->json([
            'data' => [
                'account' => [
                    'name' => $user->name,
                    'phone' => $user->phone,
                    'email' => $user->email,
                    'avatar' => \App\Support\Media::url($user->avatar_path),
                    'locale' => $user->locale,
                    'languages' => self::LANGUAGES,
                ],
                'accessibility' => [
                    'voice_mode' => (bool) $user->voice_mode,
                    'large_text' => (bool) $user->large_text,
                    'helper_mode' => (bool) $user->helper_mode,
                ],
                'notifications' => [
                    'voice' => (bool) $user->notify_voice,
                    'sms' => (bool) $user->notify_sms,
                    'inapp' => (bool) $user->notify_inapp,
                ],
                'payment_methods' => [
                    'payout_method' => $seller?->payout_method,
                    'payout_account' => $seller?->payout_account,
                    'linked' => $seller?->payout_method !== null,
                ],
                'security' => [
                    'biometric_enabled' => (bool) $user->biometric_enabled,
                    'pin_configured' => $user->hasPin(),
                ],
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:120'],
            'locale' => ['nullable', 'string', 'max:5'],
            'avatar' => ['nullable', 'image', 'max:4096'],
            'voice_mode' => ['nullable', 'boolean'],
            'large_text' => ['nullable', 'boolean'],
            'helper_mode' => ['nullable', 'boolean'],
            'notify_voice' => ['nullable', 'boolean'],
            'notify_sms' => ['nullable', 'boolean'],
            'notify_inapp' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        if (isset($validated['name']) && trim((string) $validated['name']) !== '') {
            $user->forceFill(['name' => trim($validated['name'])])->save();
        }

        if (isset($validated['locale'])) {
            $user->forceFill(['locale' => $validated['locale']])->save();
        }

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->forceFill(['avatar_path' => $path])->save();
        }

        $flags = ['voice_mode', 'large_text', 'helper_mode', 'notify_voice', 'notify_sms', 'notify_inapp'];

        $changes = [];

        foreach ($flags as $flag) {
            if (array_key_exists($flag, $validated)) {
                $user->forceFill([$flag => (bool) $validated[$flag]])->save();
                $changes[$flag] = (bool) $validated[$flag];
            }
        }

        return response()->json([
            'message' => 'Paramètres enregistrés.',
            'updated' => array_keys($changes),
        ]);
    }

    /**
     * Assistance : contact direct avec un conseiller humain.
     */
    public function contact(request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => ['nullable', 'string', 'max:190'],
            'message' => ['required', 'string', 'max:5000'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        \App\Services\AuditService::log('support.contact', null, [
            'subject' => $validated['subject'] ?? null,
            'message' => $validated['message'],
            'phone' => $validated['phone'] ?? null,
        ]);

        return response()->json([
            'message' => 'Votre message a été transmis à un conseiller. Il vous répondra au plus vite.',
            'ticket' => 'SUP-'.substr((string) random_int(100000, 999999), 0, 6),
        ]);
    }
}