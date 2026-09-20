<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * 4 catégories principales (is_main) conformément au cahier des charges.
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
