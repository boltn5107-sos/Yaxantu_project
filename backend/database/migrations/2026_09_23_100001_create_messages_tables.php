<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Discussion acheteur ↔ vendeur (texte + note vocale), simple comme un chat.
 * Une conversation réunit un acheteur et une boutique ; les messages sont
 * horodatés. L'écrit et la voix sont disponibles par défaut (aucun réglage).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')
                ->index()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('seller_id')
                ->index()
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->unique(['buyer_id', 'seller_id']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')
                ->index()
                ->constrained('conversations')
                ->cascadeOnDelete();
            $table->foreignId('sender_id')
                ->index()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('kind')->default('text');
            $table->text('text')->nullable();
            $table->string('voice_path')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('conversations');
    }
};