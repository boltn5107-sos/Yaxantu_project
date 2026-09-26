<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Services\ConfigService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Configuration du checkout (paiement à la livraison, codes promo).
 *
 * Les valeurs sont stockées dans business_configs via ConfigService : elles
 * sont appliquées immédiatement côté API (méthodes de paiement) et côté
 * formulaire de commande.
 */
class AdminConfigController extends Controller
{
    public function __construct(
        private readonly ConfigService $config,
    ) {}

    /**
     * Règles d'affichage du checkout (lecture).
     */
    public function checkout(): JsonResponse
    {
        return response()->json(['data' => [
            'cod_enabled' => $this->config->codEnabled(),
            'promo_codes_enabled' => $this->config->promoCodesEnabled(),
        ]]);
    }

    /**
     * Met à jour les règles d'affichage du checkout (écriture).
     */
    public function updateCheckout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cod_enabled' => ['nullable', 'boolean'],
            'promo_codes_enabled' => ['nullable', 'boolean'],
        ]);

        if (array_key_exists('cod_enabled', $validated)) {
            $this->config->set(
                'payments.cod_enabled',
                (bool) $validated['cod_enabled'],
                'Activer le paiement à la livraison (COD).',
            );
        }

        if (array_key_exists('promo_codes_enabled', $validated)) {
            $this->config->set(
                'marketing.promo_codes_enabled',
                (bool) $validated['promo_codes_enabled'],
                'Activer les codes promo au moment du paiement.',
            );
        }

        return response()->json([
            'message' => 'Configuration du checkout mise à jour.',
            'data' => [
                'cod_enabled' => $this->config->codEnabled(),
                'promo_codes_enabled' => $this->config->promoCodesEnabled(),
            ],
        ]);
    }
}