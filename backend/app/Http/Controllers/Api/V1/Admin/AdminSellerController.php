<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AuditEvent;
use App\Enums\VerificationStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Notification;
use App\Models\Seller;
use App\Models\SellerVerification;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSellerController extends Controller
{
    /**
     * Boutiques : vérification d'identité + pilotage des statuts.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending_verification,active,suspended,closed'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Seller::query()
            ->with(['user:id,name,email,phone'])
            ->withCount(['products as products_count', 'orders as orders_count']);

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = '%'.$validated['search'].'%';
            $query->where(function ($q) use ($search) {
                $q->where('shop_name', 'like', $search)
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $search));
            });
        }

        $sellers = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $sellers->map(fn (Seller $seller) => [
                'id' => $seller->id,
                'shop_name' => $seller->shop_name,
                'slug' => $seller->slug,
                'status' => $seller->status,
                'verification_level' => (int) $seller->verification_level,
                'verified_at' => $seller->verified_at?->toIso8601String(),
                'trust_score' => (int) $seller->trust_score,
                'products_count' => (int) $seller->products_count,
                'orders_count' => (int) $seller->orders_count,
                'owner' => $seller->user ? [
                    'name' => $seller->user->name,
                    'email' => $seller->user->email,
                    'phone' => $seller->user->phone,
                ] : null,
                'created_at' => $seller->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $sellers->currentPage(),
                'last_page' => $sellers->lastPage(),
                'per_page' => $sellers->perPage(),
                'total' => $sellers->total(),
            ],
        ]);
    }

    /**
     * Valider une boutique : passe en « active », niveau de vérification à 2.
     */
    public function verify(Request $request, Seller $seller): JsonResponse
    {
        $seller->update([
            'status' => 'active',
            'verification_level' => 2,
            'verified_at' => now(),
        ]);

        SellerVerification::updateOrCreate(
            ['seller_id' => $seller->id, 'type' => 'business_docs'],
            ['status' => VerificationStatus::Approved->value, 'reviewed_by' => $request->user()->id],
        );

        Notification::create([
            'user_id' => $seller->user_id,
            'type' => 'seller.verified',
            'title' => 'Boutique vérifiée !',
            'message' => 'Votre boutique « '.$seller->shop_name.' » est maintenant vérifiée. Badge débloqué.',
            'data' => [],
            'action_url' => '/seller/shop',
            'action_text' => 'Voir ma boutique',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::SellerVerified, $seller);

        return response()->json(['message' => 'Boutique vérifiée.']);
    }

    /**
     * Refuser une vérification (motif obligatoire).
     */
    public function reject(Request $request, Seller $seller): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:190']]);

        $seller->update(['status' => 'draft']);

        SellerVerification::updateOrCreate(
            ['seller_id' => $seller->id, 'type' => 'business_docs'],
            ['status' => VerificationStatus::Rejected->value, 'reviewed_by' => $request->user()->id, 'reason' => $validated['reason']],
        );

        Notification::create([
            'user_id' => $seller->user_id,
            'type' => 'seller.rejected',
            'title' => 'Vérification non retenue',
            'message' => 'Votre dossier n\'a pas été validé : '.$validated['reason'],
            'data' => [],
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::VerificationReviewed, $seller, ['result' => 'rejected', 'reason' => $validated['reason']]);

        return response()->json(['message' => 'Vérification refusée.']);
    }

    /**
     * Suspendre / fermer une boutique (action d'administration).
     */
    public function update(Request $request, Seller $seller): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,suspended,closed'],
        ]);

        $seller->update(['status' => $validated['status']]);

        if ($validated['status'] === 'suspended') {
            AuditService::log(AuditEvent::SellerSuspended, $seller);
        }

        return response()->json(['message' => 'Boutique mise à jour.']);
    }
}