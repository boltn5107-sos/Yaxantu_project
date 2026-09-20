<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Média d'ouverture de litige : photo + message vocal (voix d'abord).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('disputes', function (Blueprint $table) {
            $table->string('photo_path')->nullable()->after('evidence_files');
            $table->string('voice_path')->nullable()->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('disputes', function (Blueprint $table) {
            $table->dropColumn(['photo_path', 'voice_path']);
        });
    }
};