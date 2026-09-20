<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audio_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')
                ->index()
                ->constrained('reviews')
                ->cascadeOnDelete();
            $table->string('file_path');
            $table->float('duration')->nullable();
            $table->string('mime_type', 80)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->text('transcript')->nullable();
            $table->string('status', 20)->default('pending');
            $table->foreignId('moderator_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('moderation_reason')->nullable();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audio_reviews');
    }
};