<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sellers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('subscription_plan_id')
                ->nullable()
                ->constrained('subscription_plans')
                ->nullOnDelete();
            $table->string('shop_name');
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('status', 30)->default('draft')->index();
            $table->unsignedSmallInteger('verification_level')->default(0);
            $table->timestamp('verified_at')->nullable();
            $table->integer('commission_override_bps')->nullable()->comment('Commission personnalisée en points de base, null = régles par défaut');
            $table->string('currency', 3)->default('XOF');
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sellers');
    }
};
