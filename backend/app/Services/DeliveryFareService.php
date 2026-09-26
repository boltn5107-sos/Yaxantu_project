<?php

namespace App\Services;

use App\Models\Address;
use App\Models\Seller;
use Illuminate\Support\Collection;

/**
 * Tarification de la livraison « à la Yango » : un trajet boutique → adresse
 * facturé selon des règles de distance configurables (moteur de règles), ou
 * offert au-delà d'un seuil de sous-total.
 *
 * Un tarif n'existe que lorsque les deux extrémités du trajet sont connues
 * (position du client ET position de la boutique). Sinon le tarif vaut null :
 * l'estimation renvoie null et le checkout refuse poliment — jamais de forfait
 * facturé qui n'aurait pas été affiché, et jamais de tarif « à distance » sur
 * une boutique sans position. Aucune valeur économiques n'est codée en dur :
 * tout vient de la table business_configs.
 *
 * Règles configurables (table business_configs) :
 *   - delivery.free_threshold_minor  sous-total à partir duquel offre
 *   - delivery.tariffs               zones [max_km, base_minor, per_km_minor,
 *                                    min_minor, max_minor] ; la première règle
 *                                    dont max_km > distance(s) s'applique.
 *   - delivery.base_fee_minor        prise en charge (repli si pas de tarifs)
 *   - delivery.per_km_minor          prix au km (repli si pas de tarifs)
 *   - delivery.min_fee_minor         plancher (0 = désactivé)
 *   - delivery.max_fee_minor         plafond global (0 = désactivé)
 *   - delivery.rounding_minor        pas d'arrondi (50 par défaut)
 */
class DeliveryFareService
{
    public function __construct(
        private readonly ConfigService $config,
    ) {}

    /**
     * Distance à vol d'oiseau en km (formule de Haversine).
     *
     * @return float|null null si l'une des coordonnées est absente ou nulle.
     */
    public function distanceKm(mixed $lat1, mixed $lng1, mixed $lat2, mixed $lng2): ?float
    {
        $lat1 = $this->coordinate($lat1);
        $lng1 = $this->coordinate($lng1);
        $lat2 = $this->coordinate($lat2);
        $lng2 = $this->coordinate($lng2);

        if ($lat1 === null || $lng1 === null || $lat2 === null || $lng2 === null) {
            return null;
        }

        // (0,0) signifie "localisation inconnue", pas un vrai point géographique.
        if (abs($lat1) < 1e-6 && abs($lng1) < 1e-6) {
            return null;
        }
        if (abs($lat2) < 1e-6 && abs($lng2) < 1e-6) {
            return null;
        }

        $earthRadiusKm = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        $km = $earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($km, 1);
    }

    /**
     * Tarif d'un trajet boutique → adresse pour un sous-total donné.
     *
     * Résolution : offre si sous-total ≥ seuil (0), sinon « distance → règle de
     * zone → tarif », borné par les planchers/plafonds et arrondi au pas
     * configuré. Retourne null lorsque la distance ne peut pas être calculée
     * (position du client ou de la boutique absente) : aucun forfait de repli.
     */
    public function fareFor(Seller $seller, Address $address, int $orderSubtotalMinor): ?int
    {
        if ($orderSubtotalMinor >= $this->config->deliveryFreeThresholdMinor()) {
            return 0;
        }

        $km = $this->distanceKm(
            $seller->location_lat,
            $seller->location_lng,
            $address->latitude,
            $address->longitude,
        );

        if ($km === null) {
            return null;
        }

        $rule = $this->ruleFor($km);
        $base = (int) ($rule['base_minor'] ?? $this->config->int('delivery.base_fee_minor', 1000));
        $perKm = (int) ($rule['per_km_minor'] ?? $this->config->int('delivery.per_km_minor', 200));
        $raw = $base + (int) round($perKm * $km);

        $raw = $this->applyCap($raw, $rule['max_minor'] ?? null, $this->config->int('delivery.max_fee_minor', 0));
        $raw = $this->applyFloor($raw, $rule['min_minor'] ?? null, $this->config->int('delivery.min_fee_minor', 0));

        return $this->roundUp($raw);
    }

    /**
     * Une adresse est exploitable pour la tarification dès que ses coordonnées
     * sont présentes et ne valent pas (0,0) — cohérent avec distanceKm.
     */
    public function hasCoordinates(Address $address): bool
    {
        $lat = $this->coordinate($address->latitude);
        $lng = $this->coordinate($address->longitude);

        return $lat !== null && $lng !== null && (abs($lat) > 1e-6 || abs($lng) > 1e-6);
    }

    /** La boutique doit porter une position pour qu'un trajet soit tarifiable. */
    public function sellerHasCoordinates(Seller $seller): bool
    {
        $lat = $this->coordinate($seller->location_lat);
        $lng = $this->coordinate($seller->location_lng);

        return $lat !== null && $lng !== null && (abs($lat) > 1e-6 || abs($lng) > 1e-6);
    }

    /**
     * Détail des trajets des vendeurs du panier (pour l'estimation affichée).
     * Le tarif est null quand la distance ne peut pas être calculée ; il ne
     * doit alors jamais être présenté comme un montant.
     *
     * @param  Collection<int, \App\Models\CartItem>  $items
     * @return array<int, array<string, mixed>>
     */
    public function sellersForItems(Collection $items, Address $address): array
    {
        $grouped = $items->filter(fn ($item) => $item->requires_shipping)->groupBy('seller_id');

        $rows = [];
        foreach ($grouped as $sellerId => $group) {
            $seller = Seller::query()->find($sellerId);
            if ($seller === null) {
                continue;
            }

            $subtotal = (int) $group->sum('total_minor');
            $rows[] = [
                'seller_id' => $seller->id,
                'shop_name' => $seller->shop_name,
                'subtotal' => $subtotal,
                'distance_km' => $this->distanceKm(
                    $seller->location_lat,
                    $seller->location_lng,
                    $address->latitude,
                    $address->longitude,
                ),
                'shipping' => $this->fareFor($seller, $address, $subtotal),
                'shipping_free' => $subtotal >= $this->config->deliveryFreeThresholdMinor(),
            ];
        }

        return $rows;
    }

    /**
     * Somme des trajets de tous les vendeurs du panier, ou null dès qu'un
     * trajet requis ne peut pas être tarifé.
     *
     * @param  Collection<int, \App\Models\CartItem>  $items
     */
    public function sumForItems(Collection $items, Address $address): ?int
    {
        $total = 0;
        foreach ($this->sellersForItems($items, $address) as $row) {
            if ($row['shipping'] === null) {
                return null;
            }
            $total += $row['shipping'];
        }

        return $total;
    }

    /**
     * Règle de zone applicable pour une distance donnée.
     *
     * Les zones sont lues depuis delivery.tariffs (liste triée par distance
     * maximale) ; la première qui couvre la distance s'applique. Chaque règle
     * peut surcharger base_minor / per_km_minor et borner min_minor max_minor.
     * Sans zones configurées, une règle vide laisse les valeurs globales agir.
     *
     * @return array<string, mixed>
     */
    private function ruleFor(float $km): array
    {
        $tariffs = $this->config->get('delivery.tariffs', []);

        if (is_string($tariffs)) {
            $tariffs = json_decode($tariffs, true) ?: [];
        }

        if (! is_array($tariffs)) {
            return [];
        }

        foreach ($tariffs as $rule) {
            if (! is_array($rule) || ! array_key_exists('max_km', $rule)) {
                continue;
            }

            $maxKm = (float) ($rule['max_km'] ?? INF);
            if ($km < $maxKm) {
                return $rule;
            }
        }

        return [];
    }

    private function applyCap(int $value, ?int $ruleMax, int $globalMax): int
    {
        $max = $ruleMax ?? $globalMax;

        return $max > 0 ? min($value, $max) : $value;
    }

    private function applyFloor(int $value, ?int $ruleMin, int $globalMin): int
    {
        $min = $ruleMin ?? $globalMin;

        return $value < $min ? $min : $value;
    }

    private function roundUp(int $value): int
    {
        $step = $this->config->int('delivery.rounding_minor', 50);

        return $step > 0 ? (int) (ceil($value / $step) * $step) : $value;
    }

    /** Normalise une valeur de coordonnée (cast décimal → float), null sinon. */
    private function coordinate(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }
}