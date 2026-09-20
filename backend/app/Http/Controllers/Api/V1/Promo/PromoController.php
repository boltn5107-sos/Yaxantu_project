<?php

namespace App\Http\Controllers\Api\V1\Promo;

use App\Http\Controllers\Api\V1\Controller;
use App\Services\PromoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromoController extends Controller
{
    public function __construct(private readonly PromoService $promos) {}

    /**
     * Valide un code promo et renvoie la réduction estimée avant commande.
     */
    public function validate(Request $request): JsonResponse
    {
        $code = trim((string) $request->input('code', ''));

        if ($code === '') {
            return response()->json(['message' => 'Indiquez un code promo.'], 422);
        }

        $subtotal = $request->has('subtotal')
            ? max(0, (int) $request->input('subtotal'))
            : null;

        $error = $this->promos->errorFor($code, $subtotal, $request->user());

        if ($error !== null) {
            return response()->json(['message' => $error], 422);
        }

        $promo = $this->promos->findActive($code);

        return response()->json([
            'message' => 'Code promo valide.',
            'data' => array_merge($promo->toPublicArray(), [
                'discount' => $subtotal !== null ? $promo->discountFor($subtotal) : null,
            ]),
        ]);
    }
}