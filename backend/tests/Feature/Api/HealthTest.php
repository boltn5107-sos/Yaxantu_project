<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_reports_ok_and_database_connected(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('database', 'connected')
            ->assertJsonPath('service', 'Yaxantu');
    }

    public function test_categories_returns_seeded_main_categories(): void
    {
        $this->seed();

        $response = $this->getJson('/api/v1/categories');

        $response
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'slug',
                        'name',
                        'icon',
                        'is_main',
                        'products_count',
                        'children',
                    ],
                ],
            ]);
    }

    public function test_categories_include_products_count(): void
    {
        $this->seed();

        $response = $this->getJson('/api/v1/categories');

        $response
            ->assertOk()
            ->assertJsonPath('data.0.products_count', 3)
            ->assertJsonPath('data.3.products_count', 2);
    }
}