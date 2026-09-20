<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — livraison assurée par les livreurs de la plateforme.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->foreignId('courier_id')
                ->nullable()
                ->after('shipping_address_id')
                ->constrained('couriers')
                ->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('courier_id');
            $table->timestamp('picked_at')->nullable()->after('assigned_at');
            $table->string('delivered_proof_path')->nullable()->after('picked_at');
            $table->string('deliverer_notes')->nullable()->after('delivered_proof_path');
        });
    }

    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('courier_id');
            $table->dropColumn(['assigned_at', 'picked_at', 'delivered_proof_path', 'deliverer_notes']);
        });
    }
};