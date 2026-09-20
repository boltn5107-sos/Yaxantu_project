<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — sécurité (PIN, biométrie) et accessibilité/notification.
 * Le mode 100% vocal et le mode "aide-moi" sont des options d'affichage/UX.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('pin_hash')->nullable()->after('password');
            $table->boolean('biometric_enabled')->default(false)->after('pin_hash');
            $table->boolean('voice_mode')->default(false)->after('biometric_enabled');
            $table->boolean('large_text')->default(false)->after('voice_mode');
            $table->boolean('helper_mode')->default(false)->after('large_text');
            $table->boolean('notify_voice')->default(true)->after('helper_mode');
            $table->boolean('notify_sms')->default(true)->after('notify_voice');
            $table->boolean('notify_inapp')->default(true)->after('notify_sms');
            $table->timestamp('profile_choice_at')->nullable()->after('notify_inapp');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'pin_hash',
                'biometric_enabled',
                'voice_mode',
                'large_text',
                'helper_mode',
                'notify_voice',
                'notify_sms',
                'notify_inapp',
                'profile_choice_at',
            ]);
        });
    }
};