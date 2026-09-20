<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')
                ->unique()
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->bigInteger('amount_available')->default(0);
            $table->bigInteger('amount_pending')->default(0);
            $table->string('currency', 3)->default('XOF');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_balances');
    }
};
