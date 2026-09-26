<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\Courier;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            SubscriptionPlanSeeder::class,
            CategorySeeder::class,
            BusinessConfigSeeder::class,
            ProductSeeder::class,
            MarketingSeeder::class,
        ]);

        $admin = User::updateOrCreate(
            ['email' => 'admin@yaxantu.local'],
            [
                'name' => 'Taaba-taaba Admin',
                'password' => 'ChangeMe2026!',
                'email_verified_at' => now(),
            ],
        );

        $admin->assignRole(Role::Admin);

        // Livreur de démonstration (onboarding terminé, zone Dakar, validé).
        $courier = User::updateOrCreate(
            ['email' => 'courier@yaxantu.local'],
            [
                'name' => 'Fallou Gueye',
                'password' => 'Password123!',
                'phone' => '+221771234567',
                'email_verified_at' => now(),
            ],
        );
        $courier->assignRole(Role::Delivery);

        Courier::updateOrCreate(
            ['user_id' => $courier->id],
            [
                'status' => 'approved',
                'onboarding_step' => 4,
                'is_onboarded' => true,
                'transport_type' => 'moto',
                'zone_lat' => 14.7167,
                'zone_lng' => -17.4677,
                'zone_radius_km' => 50,
                'zone_address' => 'Dakar - Plateau',
                'available' => true,
                'approved_at' => now(),
            ],
        );
    }
}
