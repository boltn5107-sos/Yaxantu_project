<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Évolution du score de confiance (analyse vendeur) avec raisons lisibles :
 * ce qui l'a fait monter ou baisser, sans jargon.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trust_score_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')
                ->index()
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->integer('delta');
            $table->unsignedSmallInteger('score_after');
            $table->string('reason', 160);
            $table->json('data')->nullable();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trust_score_events');
    }
};