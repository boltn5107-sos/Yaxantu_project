<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Enums\SellerStatus;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Catalogue de démonstration : vendeurs vérifiés et produits répartis
     * dans les catégories principales. Les valeurs monétaires sont en FCFA
     * (price_minor = montant entier, la devise XOF n'a pas de sous-unité).
     */
    public function run(): void
    {
        $sellers = collect([
            [
                'shop_name' => 'TechStore CM',
                'email' => 'techstore@yaxantu.local',
                'description' => 'Smartphones, audio et accessoires high-tech.',
                'verified' => true,
            ],
            [
                'shop_name' => 'SportPlus',
                'email' => 'sportplus@yaxantu.local',
                'description' => 'Équipements et vêtements de sport.',
                'verified' => true,
            ],
            [
                'shop_name' => 'Maison & Plus',
                'email' => 'maisonplus@yaxantu.local',
                'description' => 'Maison, cuisine et décoration.',
                'verified' => false,
            ],
            [
                'shop_name' => 'Marché Frais',
                'email' => 'marchefrais@yaxantu.local',
                'description' => 'Produits frais et alimentation locale.',
                'verified' => false,
            ],
        ])->mapWithKeys(function (array $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['shop_name'],
                    'password' => 'Password123!',
                    'status' => 'active',
                ],
            );

            $user->assignRole(Role::Seller);

            $seller = Seller::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'shop_name' => $data['shop_name'],
                    'slug' => Str::slug($data['shop_name']),
                    'description' => $data['description'],
                    'status' => SellerStatus::Active->value,
                    'verification_level' => $data['verified'] ? 2 : 0,
                    'verified_at' => $data['verified'] ? now() : null,
                    'currency' => 'XOF',
                ],
            );

            return [$data['email'] => $seller];
        });

        $categories = Category::pluck('id', 'slug');

        $products = [
            [
                'name' => 'Smartphone Pro X200',
                'seller' => 'techstore@yaxantu.local',
                'category' => 'electronique',
                'price' => 45000,
                'stock' => 12,
                'featured' => true,
                'rating' => [4.5, 128],
                'short' => 'Écran AMOLED 6.7", 128 Go, 5G.',
                'description' => 'Expérience mobile haut de gamme : écran AMOLED 6.7" 120Hz, processeur rapide, batterie 5000 mAh et appareil photo avancé.',
                'images' => 3,
            ],
            [
                'name' => 'Casque Audio Bluetooth',
                'seller' => 'techstore@yaxantu.local',
                'category' => 'electronique',
                'price' => 8500,
                'stock' => 40,
                'featured' => true,
                'rating' => [4.6, 234],
                'short' => 'Réduction de bruit active, 30 h d\'autonomie.',
                'description' => 'Casque sans fil confortable avec réduction de bruit, commandes tactiles et autonomie de 30 heures.',
                'images' => 2,
            ],
            [
                'name' => 'Montre Connectée Sport',
                'seller' => 'techstore@yaxantu.local',
                'category' => 'electronique',
                'price' => 22000,
                'stock' => 18,
                'featured' => false,
                'rating' => [4.4, 167],
                'short' => 'Suivi cardio, GPS et notifications.',
                'description' => 'Montre connectée étanche avec suivi du rythme cardiaque, GPS intégré et notifications intelligentes.',
                'images' => 2,
            ],
            [
                'name' => 'Chaussures de Course Premium',
                'seller' => 'sportplus@yaxantu.local',
                'category' => 'mode-beaute',
                'price' => 12500,
                'stock' => 25,
                'featured' => true,
                'rating' => [4.8, 89],
                'short' => 'Amorti léger, semelle antidérapante.',
                'description' => 'Chaussures de running légères avec amorti réactif et mesh respirant pour vos entraînements quotidiens.',
                'images' => 3,
            ],
            [
                'name' => 'Sac à Main en Cuir',
                'seller' => 'maisonplus@yaxantu.local',
                'category' => 'mode-beaute',
                'price' => 18000,
                'stock' => 9,
                'featured' => false,
                'rating' => [4.3, 54],
                'short' => 'Cuir véritable, finitions artisanales.',
                'description' => 'Sac à main élégant en cuir véritable, plusieurs compartiments et bandoulière ajustable.',
                'images' => 2,
            ],
            [
                'name' => 'Set Ustensiles de Cuisine',
                'seller' => 'maisonplus@yaxantu.local',
                'category' => 'maison-electromenager',
                'price' => 28000,
                'stock' => 14,
                'featured' => true,
                'rating' => [4.7, 156],
                'short' => '12 pièces en acier inoxydable.',
                'description' => 'Set complet de 12 ustensiles de cuisine en acier inoxydable, résistants à la chaleur et faciles à nettoyer.',
                'images' => 2,
            ],
            [
                'name' => 'Ventilateur Colonne Silencieux',
                'seller' => 'maisonplus@yaxantu.local',
                'category' => 'maison-electromenager',
                'price' => 15000,
                'stock' => 0,
                'featured' => false,
                'rating' => [4.1, 37],
                'short' => '3 vitesses, oscillation, télécommande.',
                'description' => 'Ventilateur colonne silencieux avec trois vitesses, oscillation et télécommande.',
                'images' => 1,
            ],
            [
                'name' => 'Panier de Fruits Frais',
                'seller' => 'marchefrais@yaxantu.local',
                'category' => 'alimentation',
                'price' => 5000,
                'stock' => 30,
                'featured' => true,
                'rating' => [4.5, 72],
                'short' => 'Sélection de fruits de saison.',
                'description' => 'Panier de fruits frais de saison sélectionnés chez des producteurs locaux.',
                'images' => 2,
            ],
            [
                'name' => 'Sac de Riz 25 kg',
                'seller' => 'marchefrais@yaxantu.local',
                'category' => 'alimentation',
                'price' => 12000,
                'stock' => 60,
                'featured' => false,
                'rating' => [4.6, 210],
                'short' => 'Riz parfumé de qualité supérieure.',
                'description' => 'Sac de riz parfumé de 25 kg, grain long et qualité supérieure.',
                'images' => 1,
            ],
        ];

        foreach ($products as $data) {
            $seller = $sellers[$data['seller']];
            $slug = Str::slug($data['name']);

            $product = Product::updateOrCreate(
                ['slug' => $slug],
                [
                    'seller_id' => $seller->id,
                    'category_id' => $categories[$data['category']] ?? null,
                    'name' => $data['name'],
                    'short_description' => $data['short'],
                    'description' => $data['description'],
                    'price_minor' => $data['price'],
                    'price_currency' => 'XOF',
                    'stock_quantity' => $data['stock'],
                    'is_active' => true,
                    'is_featured' => $data['featured'],
                    'rating_average' => $data['rating'][0],
                    'rating_count' => $data['rating'][1],
                    'status' => 'published',
                    'visibility' => 'public',
                ],
            );

            $product->images()->delete();

            for ($i = 1; $i <= $data['images']; $i++) {
                $product->images()->create([
                    'path' => "/images/products/{$slug}-{$i}.jpg",
                    'alt_text' => $data['name'],
                    'is_primary' => $i === 1,
                    'sort_order' => $i,
                    'mime_type' => 'image/jpeg',
                    'width' => 800,
                    'height' => 600,
                ]);
            }

            Inventory::updateOrCreate(
                ['product_id' => $product->id],
                [
                    'quantity' => $data['stock'],
                    'reserved_quantity' => 0,
                    'reorder_level' => 5,
                    'tracking_enabled' => true,
                ],
            );
        }
    }
}
