<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Historique financier du vendeur : brute / commission / frais / net.
 * Chaque vente confirmée et chaque retrait produit une ligne.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')
                ->index()
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->string('type', 30)->index();        // sale | commission | payout | release
            $table->string('direction', 10);            // in | out
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('XOF');
            $table->unsignedBigInteger('commission_minor')->default(0);
            $table->unsignedBigInteger('fee_minor')->default(0);
            $table->unsignedBigInteger('net_minor')->default(0);
            $table->foreignId('order_id')
                ->nullable()
                ->constrained('orders')
                ->nullOnDelete();
            $table->foreignId('payout_id')
                ->nullable()
                ->constrained('seller_payouts')
                ->nullOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['seller_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_transactions');
    }
};