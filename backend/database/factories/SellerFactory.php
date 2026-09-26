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
            // Position par défaut (Douala) : la tarification de la livraison
            // exige des coordonnées sur les deux extrémités du trajet. Les
            // tests qui couvrent les adresses de Douala obtiennent un tarif
            // déterministe (distance 0 → prise en charge de base).
            'location_lat' => 4.0511,
            'location_lng' => 9.7679,
            'location_address' => 'Boutique test',
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