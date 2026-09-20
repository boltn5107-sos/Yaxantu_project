<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = [
        'parent_id',
        'slug',
        'icon',
        'image_path',
        'is_main',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_main' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function translations(): HasMany
    {
        return $this->hasMany(CategoryTranslation::class);
    }

    public function translatedName(string $locale = 'fr'): string
    {
        $translation = $this->translations->firstWhere('locale', $locale)
            ?? $this->translations->first();

        return $translation?->name ?: $this->slug;
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
