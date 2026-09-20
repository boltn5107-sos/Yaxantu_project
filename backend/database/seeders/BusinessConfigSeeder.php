<?php

namespace Database\Seeders;

use App\Services\ConfigService;
use Illuminate\Database\Seeder;

class BusinessConfigSeeder extends Seeder
{
    public function run(ConfigService $config): void
    {
        $defaults = [
            'commerce.currency' => ['XOF', 'Devise par défaut (ISO 4217).'],
            'commission.default_rate_bps' => [100, 'Commission globale par défaut, en points de base (100 = 1 %).'],
            'commission.tiers' => [[
                ['min' => 0, 'bps' => 800, 'label' => 'Démarrage'],
                ['min' => 250000, 'bps' => 600, 'label' => 'En croissance'],
                ['min' => 1000000, 'bps' => 400, 'label' => 'Gros volume'],
            ], 'Paliers de commission dégressifs par volume mensuel (unités mineures + bps).'],
            'payments.fee_bps' => [100, 'Frais de paiement mobile money / Wave, en points de base (100 = 1 %).'],
            'payout.min_amount_minor' => [1000, 'Retrait minimal, en unités mineures.'],
            'payout.max_amount_minor' => [0, 'Retrait maximal par opération. 0 = sans limite.'],
            'payout.fee_bps' => [0, 'Frais de retrait, en points de base.'],
            'payout.auto_schedule_days' => [1, 'Rythme du versement automatique (jours).'],
            'order.payment_timeout_minutes' => [30, 'Durée avant expiration d\'un paiement en attente.'],
            'cart.expiration_minutes' => [60, 'Durée de validité des articles réservés au panier.'],
            'delivery.review_hours' => [24, 'Délai d\'approbation d\'un livreur (heures).'],
        ];

        foreach ($defaults as $key => [$value, $description]) {
            $config->set($key, $value, $description);
        }
    }
}
