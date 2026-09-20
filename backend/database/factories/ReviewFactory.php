<?php

namespace Database\Factories;

use App\Enums\ReviewStatus;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Review>
 */
class ReviewFactory extends Factory
{
    protected $model = Review::class;

    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'user_id' => User::factory(),
            'rating' => fake()->numberBetween(1, 5),
            'title' => fake()->words(3, true),
            'content' => fake()->paragraph(),
            'is_verified_purchase' => false,
            'is_approved' => false,
            'is_visible' => true,
            'helpful_count' => 0,
            'reported_count' => 0,
            'status' => ReviewStatus::Pending->value,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (): array => [
            'is_approved' => true,
            'status' => ReviewStatus::Approved->value,
        ]);
    }
}