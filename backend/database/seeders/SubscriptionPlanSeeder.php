<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Plans d'abonnement vendeur (valeurs initiales 100 % modifiables en admin).
     * Les prix ne sont jamais codés ailleurs que dans la base de données.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Gratuit',
                'slug' => 'free',
                'description' => 'Pour démarrer : produits illimités en saisie simple.',
                'price_minor' => 0,
                'max_products' => null,
                'advanced_statistics' => false,
                'boost_eligible' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Professionnel',
                'slug' => 'professional',
                'description' => 'Statistiques avancées et mise en avant possible.',
                'price_minor' => 0,
                'max_products' => null,
                'advanced_statistics' => true,
                'boost_eligible' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Entreprise',
                'slug' => 'enterprise',
                'description' => 'Multitude d\'outils, catalogue avancé et support dédié.',
                'price_minor' => 0,
                'max_products' => null,
                'advanced_statistics' => true,
                'boost_eligible' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan,
            );
        }
    }
}
