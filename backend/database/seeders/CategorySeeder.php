<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * 11 catégories principales (is_main) couvrant les besoins courants.
     * Les traductions fr/en constituent la base du multilinguisme.
     */
    public function run(): void
    {
        $main = [
            [
                'slug' => 'electronique',
                'icon' => 'smartphone',
                'sort_order' => 1,
                'translations' => [
                    'fr' => ['name' => 'Électronique', 'description' => 'Téléphones, ordinateurs, accessoires.'],
                    'en' => ['name' => 'Electronics', 'description' => 'Phones, computers, accessories.'],
                ],
            ],
            [
                'slug' => 'mode-beaute',
                'icon' => 'shirt',
                'sort_order' => 2,
                'translations' => [
                    'fr' => ['name' => 'Mode & Beauté', 'description' => 'Vêtements, chaussures, cosmétiques.'],
                    'en' => ['name' => 'Fashion & Beauty', 'description' => 'Clothing, shoes, cosmetics.'],
                ],
            ],
            [
                'slug' => 'maison-electromenager',
                'icon' => 'home',
                'sort_order' => 3,
                'translations' => [
                    'fr' => ['name' => 'Maison', 'description' => 'Meubles, décoration, électroménager.'],
                    'en' => ['name' => 'Home', 'description' => 'Furniture, decor, appliances.'],
                ],
            ],
            [
                'slug' => 'alimentation',
                'icon' => 'grocery',
                'sort_order' => 4,
                'translations' => [
                    'fr' => ['name' => 'Alimentation', 'description' => 'Épicerie, produits frais et locaux.'],
                    'en' => ['name' => 'Groceries', 'description' => 'Groceries, fresh and local products.'],
                ],
            ],
            [
                'slug' => 'bebe-enfants',
                'icon' => 'baby',
                'sort_order' => 5,
                'translations' => [
                    'fr' => ['name' => 'Bébé & Enfants', 'description' => 'Couches, jouets, vêtements pour enfants.'],
                    'en' => ['name' => 'Baby & Kids', 'description' => 'Diapers, toys, kids clothing.'],
                ],
            ],
            [
                'slug' => 'sport-loisirs',
                'icon' => 'dumbbell',
                'sort_order' => 6,
                'translations' => [
                    'fr' => ['name' => 'Sport & Loisirs', 'description' => 'Chaussures de sport, équipements, jeux.'],
                    'en' => ['name' => 'Sports & Leisure', 'description' => 'Sportswear, equipment, games.'],
                ],
            ],
            [
                'slug' => 'sante-bien-etre',
                'icon' => 'heart-pulse',
                'sort_order' => 7,
                'translations' => [
                    'fr' => ['name' => 'Santé & Bien-être', 'description' => 'Soins, phytothérapie, produits naturels.'],
                    'en' => ['name' => 'Health & Wellness', 'description' => 'Care, herbal and natural products.'],
                ],
            ],
            [
                'slug' => 'livres-papeterie',
                'icon' => 'book',
                'sort_order' => 8,
                'translations' => [
                    'fr' => ['name' => 'Livres & Papeterie', 'description' => 'Livres, fournitures scolaires et bureau.'],
                    'en' => ['name' => 'Books & Stationery', 'description' => 'Books, school and office supplies.'],
                ],
            ],
            [
                'slug' => 'artisanat-deco',
                'icon' => 'palette',
                'sort_order' => 9,
                'translations' => [
                    'fr' => ['name' => 'Artisanat & Déco', 'description' => 'Objets faits main, décoration, bijoux.'],
                    'en' => ['name' => 'Crafts & Decor', 'description' => 'Handmade items, decor, jewelry.'],
                ],
            ],
            [
                'slug' => 'auto-motos',
                'icon' => 'car',
                'sort_order' => 10,
                'translations' => [
                    'fr' => ['name' => 'Auto & Moto', 'description' => 'Pièces détachées, accessoires, entretien.'],
                    'en' => ['name' => 'Cars & Bikes', 'description' => 'Spare parts, accessories, maintenance.'],
                ],
            ],
            [
                'slug' => 'animaux',
                'icon' => 'paw-print',
                'sort_order' => 11,
                'translations' => [
                    'fr' => ['name' => 'Animaux', 'description' => 'Animaux de compagnie, accessoires et alimentation.'],
                    'en' => ['name' => 'Pets', 'description' => 'Pets, accessories and food.'],
                ],
            ],
        ];

        foreach ($main as $item) {
            $category = Category::updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'icon' => $item['icon'],
                    'is_main' => true,
                    'sort_order' => $item['sort_order'],
                    'is_active' => true,
                ],
            );

            foreach ($item['translations'] as $locale => $text) {
                $category->translations()->updateOrCreate(
                    ['locale' => $locale],
                    $text,
                );
            }
        }
    }
}
