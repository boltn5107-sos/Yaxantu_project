<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('access.roles', []) as $slug => $definition) {
            Role::updateOrCreate(
                ['slug' => $slug],
                ['name' => $definition['label'], 'description' => $definition['label']],
            );
        }
    }
}
