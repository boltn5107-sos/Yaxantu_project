<?php

namespace Database\Factories;

use App\Enums\SellerStatus;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Seller>
 */
class SellerFactory extends Factory
{
    protected $model = Seller::class;

    public function definition(): array
    {
        $shopName = fake()->unique()->company();

        return [
            'user_id' => User::factory(),
            'shop_name' => $shopName,
            'slug' => Str::slug($shopName).'-'.fake()->unique()->numberBetween(1, 99999),
            'description' => fake()->sentence(),
            'status' => SellerStatus::Active->value,
            'verification_level' => 0,
            'verified_at' => null,
            'currency' => 'XOF',
        ];
    }

    public function verified(): static
    {
        return $this->state(fn (): array => [
            'verification_level' => 2,
            'verified_at' => now(),
        ]);
    }
}