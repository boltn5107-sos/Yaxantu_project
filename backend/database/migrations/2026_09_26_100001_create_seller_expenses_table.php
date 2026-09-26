<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Module Comptabilité vendeur — dépenses enregistrées par le vendeur
 * (montant, catégorie, date, description, pièce justificative) et objectif
 * de ventes mensuel porté par la boutique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')
                ->index()
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('XOF');
            $table->string('category', 30)->index();
            $table->date('incurred_at');
            $table->string('description', 500)->nullable();
            $table->string('receipt_path')->nullable();
            $table->timestamps();

            $table->index(['seller_id', 'incurred_at']);
        });

        Schema::table('sellers', function (Blueprint $table) {
            $table->unsignedBigInteger('monthly_goal_minor')->default(0)->after('trust_score');
        });
    }

    public function down(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            $table->dropColumn('monthly_goal_minor');
        });

        Schema::dropIfExists('seller_expenses');
    }
};