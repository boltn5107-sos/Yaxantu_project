<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Courier;
use App\Models\Notification;
use App\Services\AuditService;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Validation des livreurs sous 24 h (phase 3) : l'approbation envoie un SMS /
 * appel vocal simulé (notification) et débloque la bascule de disponibilité.
 */
class CourierApprovalController extends Controller
{
    public function pending(Request $request): JsonResponse
    {
        $couriers = Courier::query()
            ->where('status', 'pending')
            ->with('user')
            ->orderBy('updated_at')
            ->get();

        return response()->json([
            'data' => $couriers->map(fn (Courier $c) => [
                'id' => $c->id,
                'name' => $c->user?->name,
                'phone' => $c->user?->phone,
                'transport_type' => $c->transport_type,
                'zone_address' => $c->zone_address,
                'identity_photo' => Media::url($c->identity_photo_path),
                'selfie' => Media::url($c->selfie_path),
                'payout_method' => $c->payout_method,
                'submitted_at' => $c->updated_at?->toIso8601String(),
            ]),
        ]);
    }

    public function approve(Request $request, Courier $courier): JsonResponse
    {
        $courier->forceFill([
            'status' => 'approved',
            'approved_at' => now(),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'reject_reason' => null,
        ])->save();

        \App\Models\Notification::create([
            'user_id' => $courier->user_id,
            'type' => 'delivery.approved',
            'title' => 'Vous êtes validé !',
            'message' => 'Bonne nouvelle : votre inscription livreur est acceptée. Passez à la disponibilité.',
            'data' => [],
            'action_url' => '/delivery/availability',
            'action_text' => 'Être disponible',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::VerificationReviewed, $courier, ['result' => 'approved']);

        return response()->json(['message' => 'Livreur validé. Confirmation envoyée.']);
    }

    public function reject(Request $request, Courier $courier): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:190']]);

        $courier->forceFill([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'reject_reason' => $validated['reason'],
        ])->save();

        \App\Models\Notification::create([
            'user_id' => $courier->user_id,
            'type' => 'delivery.rejected',
            'title' => 'Inscription non retenue',
            'message' => 'Votre demande a été refusée : '.$validated['reason'],
            'data' => [],
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::VerificationReviewed, $courier, ['result' => 'rejected', 'reason' => $validated['reason']]);

        return response()->json(['message' => 'Demande refusée. L\'intéressé a été prévenu.']);
    }

    /**
     * Suspendre un livreur approuvé (indisponible immédiatement).
     */
    public function suspend(Request $request, Courier $courier): JsonResponse
    {
        if ($courier->status !== 'approved') {
            throw ValidationException::withMessages(['courier' => ['Seul un livreur approuvé peut être suspendu.']]);
        }

        $courier->forceFill([
            'status' => 'suspended',
            'available' => false,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        Notification::create([
            'user_id' => $courier->user_id,
            'type' => 'delivery.suspended',
            'title' => 'Compte livreur suspendu',
            'message' => 'Votre compte livreur a été suspendu par la plateforme. Contactez le support pour plus de détails.',
            'data' => [],
            'action_url' => '/help',
            'action_text' => 'Page d\'aide',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::CourierSuspended, $courier);

        return response()->json(['message' => 'Livreur suspendu.']);
    }

    /**
     * Réactiver un livreur suspendu.
     */
    public function reactivate(Request $request, Courier $courier): JsonResponse
    {
        if ($courier->status !== 'suspended') {
            throw ValidationException::withMessages(['courier' => ['Seul un livreur suspendu peut être réactivé.']]);
        }

        $courier->forceFill([
            'status' => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'reject_reason' => null,
        ])->save();

        Notification::create([
            'user_id' => $courier->user_id,
            'type' => 'delivery.reactivated',
            'title' => 'Compte livreur réactivé',
            'message' => 'Votre compte livreur est de nouveau actif. Vous pouvez reprendre vos livraisons.',
            'data' => [],
            'action_url' => '/delivery/availability',
            'action_text' => 'Être disponible',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::CourierActivated, $courier);

        return response()->json(['message' => 'Livreur réactivé.']);
    }
}