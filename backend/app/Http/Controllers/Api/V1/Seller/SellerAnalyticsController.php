<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Api\V1\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Analyse vendeur (phase 3) : gros chiffres + pictogrammes, zéro analyse
 * textuelle. CA & variation, ventes par jour, top produits, taux de clients
 * fidèles, évolution du score de confiance expliquée.
 */
class SellerAnalyticsController extends Controller
{
    public function __construct(
        private readonly AnalyticsService $analytics,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $period = in_array($request->query('period'), ['7d', '30d', '90d'], true)
            ? $request->query('period')
            : '30d';

        return response()->json(['data' => $this->analytics->report($seller, $period)]);
    }
}