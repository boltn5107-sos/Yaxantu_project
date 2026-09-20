<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'referral_code' => $this->referral_code,
            'phone_verified_at' => $this->phone_verified_at?->toIso8601String(),
            'locale' => $this->locale,
            'avatar' => Media::url($this->avatar_path),
            'status' => $this->status,
            'roles' => $this->roleSlugs(),
            'profile_type' => $this->profileType(),
            'needs_profile_choice' => $this->needsProfileChoice(),
            'settings' => [
                'voice_mode' => (bool) $this->voice_mode,
                'large_text' => (bool) $this->large_text,
                'helper_mode' => (bool) $this->helper_mode,
                'notify_voice' => (bool) $this->notify_voice,
                'notify_sms' => (bool) $this->notify_sms,
                'notify_inapp' => (bool) $this->notify_inapp,
            ],
            'security' => [
                'pin_configured' => $this->hasPin(),
                'biometric_enabled' => (bool) $this->biometric_enabled,
            ],
            'seller' => $this->whenLoaded('seller', fn () => [
                'id' => $this->seller->id,
                'shop_name' => $this->seller->shop_name,
                'slug' => $this->seller->slug,
                'status' => $this->seller->status,
                'is_onboarded' => (bool) $this->seller->is_onboarded,
                'onboarding_step' => (int) $this->seller->onboarding_step,
                'logo' => Media::url($this->seller->logo_path),
                'trust_score' => (int) $this->seller->trust_score,
            ]),
            'courier' => $this->whenLoaded('courier', fn () => [
                'id' => $this->courier->id,
                'status' => $this->courier->status,
                'is_onboarded' => (bool) $this->courier->is_onboarded,
                'onboarding_step' => (int) $this->courier->onboarding_step,
                'available' => (bool) $this->courier->available,
                'transport_type' => $this->courier->transport_type,
                'approved' => $this->courier->status === 'approved',
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}