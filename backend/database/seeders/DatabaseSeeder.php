<?php

namespace Database\Seeders;

use App\Enums\Role;
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
        ]);

        $admin = User::updateOrCreate(
            ['email' => 'admin@yaxantu.local'],
            [
                'name' => 'Yaxantu Admin',
                'password' => 'ChangeMe2026!',
                'email_verified_at' => now(),
            ],
        );

        $admin->assignRole(Role::Admin);
    }
}
