<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable()
                ->index()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('session_id', 100)->nullable()->index();
            $table->string('status', 30)->default('active')->index();
            $table->foreignId('shipping_address_id')
                ->nullable()
                ->constrained('addresses')
                ->nullOnDelete();
            $table->foreignId('billing_address_id')
                ->nullable()
                ->constrained('addresses')
                ->nullOnDelete();
            $table->string('shipping_method', 80)->nullable();
            $table->unsignedBigInteger('shipping_rate_minor')->nullable();
            $table->unsignedBigInteger('tax_rate_minor')->nullable();
            $table->unsignedBigInteger('discount_minor')->nullable();
            $table->unsignedBigInteger('total_minor')->nullable();
            $table->string('currency', 3)->default('XOF');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['session_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};