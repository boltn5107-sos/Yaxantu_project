<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')
                ->constrained('sellers')
                ->cascadeOnDelete();
            $table->string('type', 30)->comment('identity, address, business_registration, bank_account');
            $table->string('status', 20)->default('submitted')->index();
            $table->string('document_path')->nullable()->comment('Clé du fichier stockage objet');
            $table->text('reason')->nullable()->comment('Motif en cas de rejet');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_verifications');
    }
};
