<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promo_codes', function (Blueprint $table) {
            $table->foreignId('affiliate_id')
                ->nullable()
                ->after('id')
                ->constrained('affiliates')
                ->nullOnDelete();

            // Contrôle des sommes accordées (tous codes, y compris influenceurs) :
            // - plafond de réduction sur une seule commande ;
            // - limite d'utilisation du code par le même client ;
            // - plafond cumulé de remise sur toute la durée du code.
            $table->unsignedBigInteger('max_discount_per_order_minor')->nullable();
            $table->unsignedInteger('per_user_limit')->nullable();
            $table->unsignedBigInteger('max_discount_total_minor')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('promo_codes', function (Blueprint $table) {
            $table->dropForeign(['affiliate_id']);
            $table->dropColumn([
                'affiliate_id',
                'max_discount_per_order_minor',
                'per_user_limit',
                'max_discount_total_minor',
            ]);
        });
    }
};