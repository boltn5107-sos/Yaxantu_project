<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Seller;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'seller_id' => Seller::factory(),
            'name' => ucfirst(fake()->unique()->words(3, true)),
            'short_description' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'price_minor' => fake()->numberBetween(1000, 150000),
            'price_currency' => 'XOF',
            'stock_quantity' => fake()->numberBetween(0, 50),
            'is_active' => true,
            'is_featured' => false,
            'is_digital' => false,
            'requires_shipping' => true,
            'rating_average' => fake()->randomFloat(2, 0, 5),
            'rating_count' => fake()->numberBetween(0, 500),
            'status' => 'published',
            'visibility' => 'public',
        ];
    }

    public function featured(): static
    {
        return $this->state(fn (): array => ['is_featured' => true]);
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false, 'status' => 'draft']);
    }
}