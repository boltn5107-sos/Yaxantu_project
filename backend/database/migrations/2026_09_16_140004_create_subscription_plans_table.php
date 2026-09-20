<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50);
            $table->string('slug', 50)->unique();
            $table->string('description')->nullable();
            $table->unsignedBigInteger('price_minor')->default(0);
            $table->string('currency', 3)->default('XOF');
            $table->string('interval', 20)->default('monthly');
            $table->unsignedInteger('max_products')->nullable();
            $table->unsignedInteger('max_images_per_product')->nullable();
            $table->boolean('advanced_statistics')->default(false);
            $table->boolean('boost_eligible')->default(false);
            $table->json('features')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
