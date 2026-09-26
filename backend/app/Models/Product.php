<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'category_id',
        'parent_id',
        'sku',
        'name',
        'slug',
        'description',
        'short_description',
        'price_minor',
        'price_currency',
        'cost_minor',
        'stock_quantity',
        'weight',
        'dimensions',
        'is_physical',
        'is_active',
        'is_featured',
        'is_digital',
        'download_url',
        'requires_shipping',
        'length_days',
        'rating_average',
        'rating_count',
        'status',
        'visibility',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'price_minor' => 'integer',
            'cost_minor' => 'integer',
            'stock_quantity' => 'integer',
            'weight' => 'decimal:3',
            'dimensions' => 'array',
            'is_physical' => 'boolean',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'is_digital' => 'boolean',
            'requires_shipping' => 'boolean',
            'length_days' => 'integer',
            'rating_average' => 'decimal:2',
            'rating_count' => 'integer',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function audioReviews(): HasMany
    {
        return $this->hasMany(AudioReview::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = $value;
        $this->attributes['slug'] = Str::slug($value);
    }

    public function getRouteKeyName()
    {
        return 'slug';
    }
}
