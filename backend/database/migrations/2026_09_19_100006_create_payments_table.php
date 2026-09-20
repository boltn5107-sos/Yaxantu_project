<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')
                ->index()
                ->constrained('orders')
                ->cascadeOnDelete();
            $table->foreignId('seller_id')
                ->nullable()
                ->index()
                ->constrained('sellers')
                ->nullOnDelete();
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('XOF');
            $table->string('method', 40);
            $table->string('status', 30)->default('pending')->index();
            $table->string('provider', 60)->nullable();
            $table->string('provider_payment_id')->nullable();
            $table->json('gateway_response')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->unsignedBigInteger('refunded_amount_minor')->nullable();
            $table->unsignedBigInteger('fee_minor')->nullable();
            $table->unsignedBigInteger('net_amount_minor')->nullable();
            $table->string('transaction_id')->nullable()->unique();
            $table->string('capture_id')->nullable();
            $table->boolean('requires_capture')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};