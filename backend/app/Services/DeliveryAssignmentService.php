<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\Delivery;
use App\Models\Order;

/**
 * Attribution des livraisons aux livreurs disponibles (phase 3).
 *
 * Règle : un livreur approuvé et disponible est prioritaire ; s'il a défini
 * une zone et que l'adresse de livraison fournit une localisation GPS, on
 * préfère la zone libre la plus proche. Faute de livreur, la livraison reste
 * "seller" (le vendeur assure la remise).
 */
class DeliveryAssignmentService
{
    public function assign(Order $order): ?Courier
    {
        $delivery = $order->delivery;

        if ($delivery === null) {
            return null;
        }

        $query = Courier::query()
            ->where('status', 'approved')
            ->where('available', true)
            ->orderBy('zone_radius_km');

        $lat = (float) ($order->shippingAddress?->latitude ?? 0);
        $lng = (float) ($order->shippingAddress?->longitude ?? 0);

        $couriers = $query->get();

        $candidate = null;

        if ($lat !== 0.0 && $lng !== 0.0) {
            $bestDistance = null;

            foreach ($couriers as $courier) {
                if ($courier->zone_lat === null || $courier->zone_lng === null || $courier->zone_radius_km === null) {
                    continue;
                }

                $distance = $this->distanceKm($lat, $lng, (float) $courier->zone_lat, (float) $courier->zone_lng);

                if ($distance <= (int) $courier->zone_radius_km) {
                    if ($bestDistance === null || $distance < $bestDistance) {
                        $bestDistance = $distance;
                        $candidate = $courier;
                    }
                }
            }
        }

        $candidate ??= $couriers->first();

        if ($candidate === null) {
            return null;
        }

        $delivery->forceFill([
            'courier_id' => $candidate->id,
            'assigned_at' => now(),
            'status' => 'assigned',
            'provider' => $delivery->provider ?: 'platform',
        ])->save();

        return $candidate;
    }

    /** Distance haversine en kilomètres entre deux points GPS. */
    private function distanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}