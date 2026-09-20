<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — onboarding vendeur (5 étapes, zéro jargon) + parrainage
 * + score de confiance + coordonnées de versement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            $table->unsignedTinyInteger('onboarding_step')->default(0)->after('commission_override_bps');
            $table->boolean('is_onboarded')->default(false)->after('onboarding_step');
            $table->foreignId('main_category_id')
                ->nullable()
                ->after('is_onboarded')
                ->constrained('categories')
                ->nullOnDelete();
            $table->decimal('location_lat', 10, 7)->nullable()->after('main_category_id');
            $table->decimal('location_lng', 10, 7)->nullable()->after('location_lat');
            $table->string('location_address')->nullable()->after('location_lng');
            $table->string('payout_method', 30)->nullable()->after('location_address');
            $table->string('payout_account')->nullable()->after('payout_method');
            $table->foreignId('sponsor_id')
                ->nullable()
                ->after('payout_account')
                ->constrained('sellers')
                ->nullOnDelete();
            $table->unsignedSmallInteger('trust_score')->default(0)->after('sponsor_id');
            $table->timestamp('onboarded_at')->nullable()->after('trust_score');
        });
    }

    public function down(): void
    {
        Schema::table('sellers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('main_category_id');
            $table->dropConstrainedForeignId('sponsor_id');
            $table->dropColumn([
                'onboarding_step',
                'is_onboarded',
                'location_lat',
                'location_lng',
                'location_address',
                'payout_method',
                'payout_account',
                'trust_score',
                'onboarded_at',
            ]);
        });
    }
};