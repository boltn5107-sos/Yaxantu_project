<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('referrer_id');
            $table->unsignedBigInteger('referred_user_id');
            $table->unsignedBigInteger('promo_code_id')->nullable();
            $table->string('status', 16)->default('pending'); // pending | rewarded
            $table->timestamps();

            $table->foreign('referrer_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('referred_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('promo_code_id')->references('id')->on('promo_codes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referrals');
    }
};