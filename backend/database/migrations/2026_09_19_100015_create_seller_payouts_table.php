<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')
                ->index()
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->foreignId('balance_id')
                ->nullable()
                ->constrained('seller_balances')
                ->nullOnDelete();
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('XOF');
            $table->string('method', 60);
            $table->string('status', 30)->default('requested')->index();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('processed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('transaction_id')->nullable();
            $table->unsignedBigInteger('fee_minor')->nullable();
            $table->unsignedBigInteger('net_amount_minor')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['seller_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_payouts');
    }
};