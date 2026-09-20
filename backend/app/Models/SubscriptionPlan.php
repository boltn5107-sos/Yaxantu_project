<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'price_minor',
        'currency',
        'interval',
        'max_products',
        'max_images_per_product',
        'advanced_statistics',
        'boost_eligible',
        'features',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price_minor' => 'integer',
            'max_products' => 'integer',
            'max_images_per_product' => 'integer',
            'advanced_statistics' => 'boolean',
            'boost_eligible' => 'boolean',
            'features' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function sellers(): HasMany
    {
        return $this->hasMany(Seller::class);
    }
}