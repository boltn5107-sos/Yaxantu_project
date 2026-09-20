<?php

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\PromoCode;
use Illuminate\Database\Seeder;

class MarketingSeeder extends Seeder
{
    public function run(): void
    {
        PromoCode::updateOrCreate(
            ['code' => 'LAUNCH2026'],
            [
                'description' => 'Lancement Yaxantu : -10% dès 5 000 FCFA.',
                'discount_type' => 'percent',
                'discount_value' => 10,
                'min_order_minor' => 5000,
                'max_uses' => null,
                'one_time' => false,
                'is_active' => true,
                'starts_at' => now(),
                'expires_at' => now()->addDays(90),
            ],
        );

        PromoCode::updateOrCreate(
            ['code' => 'BONNE2026'],
            [
                'description' => 'Bon de bienvenue : -2 000 FCFA dès 15 000 FCFA.',
                'discount_type' => 'fixed',
                'discount_value' => 2000,
                'min_order_minor' => 15000,
                'one_time' => true,
                'is_active' => true,
                'expires_at' => now()->addDays(60),
            ],
        );

        $banners = [
            [
                'title' => 'Le terroir à portée de main',
                'subtitle' => 'Mil, maïs, arachides, karité — produits locaux livrés chez vous.',
                'image_url' => 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1600&h=600&q=80',
                'link' => '/category/alimentation',
                'sort_order' => 1,
            ],
            [
                'title' => 'Fierté citoyenne',
                'subtitle' => 'Bracelet Sonko artisanal tissé main.',
                'image_url' => 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1600&h=600&q=80',
                'link' => '/product/bracelet-sonko-artisanal',
                'sort_order' => 2,
            ],
            [
                'title' => 'Mode & créateurs locaux',
                'subtitle' => 'Pagnes wax, tenues et cosmétiques naturels.',
                'image_url' => 'https://images.unsplash.com/photo-1515555230216-82228b88ea98?auto=format&fit=crop&w=1600&h=600&q=80',
                'link' => '/category/mode-beaute',
                'sort_order' => 3,
            ],
        ];

        foreach ($banners as $data) {
            Banner::updateOrCreate(
                ['title' => $data['title']],
                $data,
            );
        }
    }
}