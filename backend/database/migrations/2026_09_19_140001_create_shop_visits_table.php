<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Statistiques de la boutique : visites (via le lien partagé) et partages
 * par canal (WhatsApp, Instagram, TikTok…). Permet au vendeur de savoir
 * d'où viennent ses visiteurs et quel canal partager en premier.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_visits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('seller_id');
            $table->string('kind', 10)->default('visit')->comment('visit|share');
            $table->string('channel', 30)->nullable()->comment('whatsapp|instagram|tiktok|messenger|telegram|x|sms|copy|autolink');
            $table->unsignedBigInteger('ref_user_id')->nullable()->comment('Vendeur qui a fait venir ce visiteur (parrainage par lien)');
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamps();

            $table->index('seller_id');
            $table->index('kind');
            $table->index(['seller_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_visits');
    }
};