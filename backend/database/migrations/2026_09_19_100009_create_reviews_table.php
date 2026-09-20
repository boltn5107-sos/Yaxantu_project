<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')
                ->index()
                ->constrained('products')
                ->cascadeOnDelete();
            $table->foreignId('order_id')
                ->nullable()
                ->index()
                ->constrained('orders')
                ->nullOnDelete();
            $table->foreignId('user_id')
                ->index()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('seller_id')
                ->nullable()
                ->index()
                ->constrained('sellers')
                ->nullOnDelete();
            $table->foreignId('parent_id')
                ->nullable()
                ->index()
                ->constrained('reviews')
                ->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('title', 200)->nullable();
            $table->text('content')->nullable();
            $table->boolean('is_verified_purchase')->default(false);
            $table->boolean('is_approved')->default(false);
            $table->boolean('is_visible')->default(true);
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('reported_count')->default(0);
            $table->string('status', 30)->default('pending')->index();
            $table->foreignId('moderator_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('moderation_reason')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'status']);
            $table->index(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};