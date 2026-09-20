<?php

namespace App\Http\Controllers\Api\V1\Payment;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Payment;
use App\Services\AuditService;
use App\Services\PaymentManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        private readonly PaymentManager $payments,
    ) {}

    /**
     * Liste des méthodes de paiement disponibles (publique, utilisée par le
     * formulaire de commande).
     */
    public function methods(): JsonResponse
    {
        return response()->json(['data' => $this->payments->methods()]);
    }

    /**
     * Callback fournisseur (webhook simulé pour le développement).
     *
     * En production, cette route serait remplacée par l'URL de webhook du
     * fournisseur et la réponse serait vérifiée par signature HMAC.
     */
    public function callback(Request $request, Payment $payment): JsonResponse
    {
        $payload = $request->validate([
            'status' => ['required', 'in:success,failed'],
            'provider_transaction_id' => ['nullable', 'string', 'max:190'],
        ]);

        AuditService::log(AuditEvent::PaymentInitiated, $payment, ['callback_received' => true]);

        if ($payload['status'] === 'success') {
            $confirmed = $this->payments->confirm($payment, $payload);

            return response()->json([
                'status' => $confirmed ? 'confirmed' : 'already_failed',
                'message' => $confirmed ? 'Paiement confirmé.' : 'La transaction ne peut pas être confirmée.',
            ]);
        }

        $this->payments->fail($payment);

        return response()->json(['status' => 'failed', 'message' => 'Paiement enregistré comme échoué.']);
    }
}