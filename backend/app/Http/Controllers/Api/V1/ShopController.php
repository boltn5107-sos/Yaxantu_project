<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Seller;
use App\Models\ShopVisit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Boutique publique + tableau de bord de partage (phase 3).
 *
 * - Public : fiche boutique (logo, note, confiance, produits) + lien de
 *   partage. Chaque visite via ce lien est comptée (canal de provenance).
 * - Vendeur : compteurs de visites/partages par canal pour savoir où
 *   partager en premier (WhatsApp, Instagram, TikTok…).
 */
class ShopController extends Controller
{
    /** Fiche publique de la boutique, appelée aussi par les liens partagés. */
    public function show(Request $request, string $slug): JsonResponse
    {
        $seller = Seller::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->with(['mainCategory', 'products' => function ($q) {
                $q->where('is_active', true)
                    ->with(['images'])
                    ->orderByDesc('created_at')
                    ->limit(24);
            }])
            ->firstOrFail();

        $refUserId = $request->integer('ref') ?: null;

        $this->recordVisit($request, $seller, $refUserId);

        $products = $seller->products->map(fn ($product) => $this->product($product));

        [$rating, $count] = $this->rating($seller);

        return response()->json([
            'data' => [
                'shop' => [
                    'id' => $seller->id,
                    'slug' => $seller->slug,
                    'shop_name' => $seller->shop_name,
                    'description' => $seller->description,
                    'logo' => $this->assetUrl($seller->logo_path),
                    'category' => $seller->mainCategory ? [
                        'id' => $seller->mainCategory->id,
                        'name' => $seller->mainCategory->name,
                        'slug' => $seller->mainCategory->slug,
                    ] : null,
                    'location' => $seller->location_address,
                    'verified' => $seller->verified_at !== null,
                    'verification_level' => (int) $seller->verification_level,
                    'trust_score' => (int) $seller->trust_score,
                    'rating_average' => round($rating, 1),
                    'rating_count' => $count,
                    'sales_count' => $seller->orders()
                        ->where('status', 'delivered')
                        ->count(),
                    'member_since' => $seller->created_at?->toIso8601String(),
                    'share_link' => $this->shareLink($seller),
                ],
                'products' => $products->values(),
                'meta' => [
                    'total_products' => $products->count(),
                ],
            ],
        ]);
    }

    /** Point de vue vendeur : infos + compteurs de visites et partages. */
    public function mine(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $visitsToday = $seller->shopVisits()
            ->where('kind', ShopVisit::KIND_VISIT)
            ->whereDate('created_at', today())
            ->count();

        $sharesByChannel = $seller->shopVisits()
            ->where('kind', ShopVisit::KIND_SHARE)
            ->selectRaw('channel, count(*) as total')
            ->groupBy('channel')
            ->pluck('total', 'channel')
            ->map(fn ($total) => (int) $total)
            ->toArray();

        // Nombre de boutiques créées via un lien de parrainage vers cette boutique.
        $sponsored = Seller::query()
            ->where('sponsor_id', $seller->id)
            ->count();

        return response()->json([
            'data' => [
                'shop' => [
                    'id' => $seller->id,
                    'slug' => $seller->slug,
                    'shop_name' => $seller->shop_name,
                    'logo' => $this->assetUrl($seller->logo_path),
                    'is_onboarded' => (bool) $seller->is_onboarded,
                    'share_link' => $this->shareLink($seller),
                    'trust_score' => (int) $seller->trust_score,
                    'payout_method' => $seller->payout_method,
                ],
                'stats' => [
                    'visits_today' => $visitsToday,
                    'visits_total' => (int) $seller->shopVisits()
                        ->where('kind', ShopVisit::KIND_VISIT)
                        ->count(),
                    'shares_total' => (int) $seller->shopVisits()
                        ->where('kind', ShopVisit::KIND_SHARE)
                        ->count(),
                    'shares_by_channel' => array_map('intval', $sharesByChannel),
                    'sponsored_shops' => $sponsored,
                ],
            ],
        ]);
    }

    /** Compte un partage effectué par le vendeur sur un canal donné. */
    public function trackShare(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $channel = $request->validate([
            'channel' => ['required', 'in:whatsapp,instagram,tiktok,messenger,telegram,x,sms,copy,autolink'],
        ])['channel'];

        ShopVisit::create([
            'seller_id' => $seller->id,
            'kind' => ShopVisit::KIND_SHARE,
            'channel' => $channel,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
        ]);

        $total = ShopVisit::query()
            ->where('seller_id', $seller->id)
            ->where('kind', ShopVisit::KIND_SHARE)
            ->where('channel', $channel)
            ->count();

        return response()->json([
            'message' => 'Partage compté sur '.$channel.'.',
            'data' => ['channel' => $channel, 'total' => (int) $total],
        ]);
    }

    public function product(\App\Models\Product $product): array
    {
        $primary = $product->images->firstWhere('is_primary', true) ?? $product->images->first();

        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'name' => $product->name,
            'short_description' => $product->short_description,
            'price' => (int) $product->price_minor,
            'currency' => $product->price_currency,
            'stock_quantity' => (int) $product->stock_quantity,
            'in_stock' => (int) $product->stock_quantity > 0,
            'rating_average' => (float) $product->rating_average,
            'rating_count' => (int) $product->rating_count,
            'requires_shipping' => (bool) $product->requires_shipping,
            'thumbnail' => $this->assetUrl($primary?->path),
            'images' => $product->images->map(fn ($image) => [
                'id' => $image->id,
                'path' => $this->assetUrl($image->path),
                'alt_text' => $image->alt_text,
                'is_primary' => (bool) $image->is_primary,
            ])->values(),
        ];
    }

    private function recordVisit(Request $request, Seller $seller, ?int $refUserId): void
    {
        // Un vendeur n'est pas "visiteur" de sa propre boutique.
        if ($request->user()?->id === $seller->user_id) {
            return;
        }

        // Le parrain ne compte pas non plus s'il se ré-ouvre son lien.
        if ($refUserId === $seller->user_id) {
            $refUserId = null;
        }

        if ($refUserId !== null && \App\Models\User::query()->whereKey($refUserId)->doesntExist()) {
            $refUserId = null;
        }

        ShopVisit::create([
            'seller_id' => $seller->id,
            'kind' => ShopVisit::KIND_VISIT,
            'channel' => $request->query('channel'),
            'ref_user_id' => $refUserId,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
        ]);
    }

    private function rating(Seller $seller): array
    {
        $products = $seller->products;

        $weighted = 0;
        $count = 0;

        foreach ($products as $product) {
            $weighted += (float) $product->rating_average * max(1, (int) $product->rating_count);
            $count += max(1, (int) $product->rating_count);
        }

        if ($count === 0) {
            return [0, 0];
        }

        return [$weighted / $count, $count];
    }

    private function shareLink(Seller $seller): string
    {
        $base = rtrim(env('FRONTEND_URL', config('app.url')), '/').'/seller/'.$seller->slug;

        return $base.'?ref='.$seller->user_id;
    }

    private function assetUrl(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http') || str_starts_with($path, '/')) {
            return $path;
        }

        return Storage::disk('public')->url($path);
    }
}