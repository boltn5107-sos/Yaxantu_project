<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')
                ->index()
                ->constrained('orders')
                ->cascadeOnDelete();
            $table->foreignId('product_id')
                ->nullable()
                ->index()
                ->constrained('products')
                ->nullOnDelete();
            $table->foreignId('product_variant_id')
                ->nullable()
                ->constrained('product_variants')
                ->nullOnDelete();
            $table->foreignId('seller_id')
                ->nullable()
                ->index()
                ->constrained('sellers')
                ->nullOnDelete();
            $table->json('product_snapshot')->nullable();
            $table->json('variant_snapshot')->nullable();
            $table->integer('quantity')->default(1);
            $table->unsignedBigInteger('unit_price_minor');
            $table->string('unit_price_currency', 3)->default('XOF');
            $table->unsignedBigInteger('discount_minor')->nullable();
            $table->unsignedBigInteger('total_minor');
            $table->decimal('tax_rate_minor', 6, 2)->nullable();
            $table->decimal('weight', 10, 3)->nullable();
            $table->boolean('requires_shipping')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};