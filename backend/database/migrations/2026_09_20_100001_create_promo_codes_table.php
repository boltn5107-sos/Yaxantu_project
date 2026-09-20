<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('description')->nullable();
            $table->string('discount_type', 10)->default('percent'); // percent | fixed
            $table->integer('discount_value')->comment('En bps pour percent sinon en FCFA (minor)');
            $table->unsignedBigInteger('min_order_minor')->nullable();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('one_time')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promo_codes');
    }
};