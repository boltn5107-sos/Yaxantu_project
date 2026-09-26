<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->string('kind', 20)->default('image')->after('mime_type');
        });

        Schema::table('product_images', function (Blueprint $table) {
            $table->index(['product_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'kind']);
        });

        Schema::table('product_images', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
    }
};