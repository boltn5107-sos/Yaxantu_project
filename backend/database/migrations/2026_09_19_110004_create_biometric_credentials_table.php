<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Credentials WebAuthn enregistrés pour le déverrouillage biométrique.
 * La vérification cryptographique réelle nécessite le jeton WebAuthn du
 * navigateur ; en développement, la structure est validée et la promesse de
 * vérification est documentée (web-auth/webauthn-lib en production).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->index()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('credential_id', 512)->unique();
            $table->text('public_key')->nullable();
            $table->string('platform', 40)->default('web');
            $table->string('challenge', 128)->nullable();
            $table->timestamp('challenge_expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_credentials');
    }
};