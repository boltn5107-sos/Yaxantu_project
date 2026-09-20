<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Les réponses des vendeurs aux avis n'ont pas de note : la colonne
        // devient nullable (une réponse = ligne parent_id renseigné).
        Schema::table('reviews', function (Blueprint $table) {
            $table->unsignedTinyInteger('rating')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->unsignedTinyInteger('rating')->nullable(false)->default(0)->change();
        });
    }
};