<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->foreignId('category_id')
                ->nullable()
                ->constrained('categories')
                ->nullOnDelete();
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('products')
                ->nullOnDelete();
            $table->string('sku', 80)->nullable()->unique();
            $table->string('name', 160);
            $table->string('slug', 190)->unique();
            $table->text('description')->nullable();
            $table->string('short_description', 255)->nullable();
            $table->unsignedBigInteger('price_minor');
            $table->string('price_currency', 3)->default('XOF');
            $table->unsignedBigInteger('cost_minor')->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->decimal('weight', 10, 3)->nullable();
            $table->json('dimensions')->nullable();
            $table->boolean('is_physical')->default(true);
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_featured')->default(false)->index();
            $table->boolean('is_digital')->default(false);
            $table->string('download_url')->nullable();
            $table->boolean('requires_shipping')->default(true);
            $table->unsignedBigInteger('shipping_rate_minor')->nullable();
            $table->unsignedSmallInteger('length_days')->nullable();
            $table->decimal('rating_average', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->string('status', 30)->default('draft')->index();
            $table->string('visibility', 20)->default('public');
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['seller_id', 'is_active']);
            $table->index(['category_id', 'is_active']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
