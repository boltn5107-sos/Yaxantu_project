<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Profils livreur (couriers) — inscription 4 étapes, validation admin,
 * disponibilité, zone de livraison et coordonnées de paiement des courses.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('couriers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('status', 30)->default('draft')->index();
            $table->unsignedTinyInteger('onboarding_step')->default(0);
            $table->boolean('is_onboarded')->default(false);
            $table->string('transport_type', 20)->nullable(); // foot | moto | bike
            $table->decimal('zone_lat', 10, 7)->nullable();
            $table->decimal('zone_lng', 10, 7)->nullable();
            $table->unsignedInteger('zone_radius_km')->nullable();
            $table->string('zone_address')->nullable();
            $table->string('identity_photo_path')->nullable();
            $table->string('selfie_path')->nullable();
            $table->string('payout_method', 30)->nullable();
            $table->string('payout_account')->nullable();
            $table->boolean('available')->default(false)->index();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('reject_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('couriers');
    }
};