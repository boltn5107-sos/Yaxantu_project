<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Programme influenceurs : profil, réglages de commission et plafonds.
        Schema::create('affiliates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('handle', 80)->unique();
            $table->string('public_name', 120)->nullable();
            $table->string('status', 20)->default('draft')->index(); // draft | active | suspended
            $table->unsignedInteger('commission_rate_bps')->nullable()->comment('Override ; sinon config affiliate.commission.default_bps');
            $table->unsignedBigInteger('monthly_cap_minor')->nullable()->comment('Plafond mensuel de commission accordée');
            $table->string('payout_method', 30)->nullable(); // mobile_money | bank | wave
            $table->string('payout_account')->nullable();
            $table->string('payout_email')->nullable();
            $table->text('motivation')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        // Solde de l'influenceur : en attente → disponible (approbation admin).
        Schema::create('affiliate_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')
                ->unique()
                ->constrained('affiliates')
                ->cascadeOnDelete();
            $table->bigInteger('amount_available')->default(0);
            $table->bigInteger('amount_pending')->default(0);
            $table->string('currency', 3)->default('XOF');
            $table->timestamps();
        });

        // Commission de l'influenceur, rattachée à une commande livrée.
        Schema::create('affiliate_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')
                ->index()
                ->constrained('affiliates')
                ->cascadeOnDelete();
            $table->foreignId('promo_code_id')
                ->index()
                ->constrained('promo_codes')
                ->cascadeOnDelete();
            $table->foreignId('order_id')
                ->unique()
                ->constrained('orders')
                ->cascadeOnDelete();
            $table->unsignedBigInteger('base_amount_minor');
            $table->unsignedInteger('rate_bps');
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('XOF');
            $table->string('status', 20)->default('pending')->index(); // pending | approved | reversed
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['affiliate_id', 'status']);
        });

        // Demandes de retrait des gains, soumises à validation admin.
        Schema::create('affiliate_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')
                ->index()
                ->constrained('affiliates')
                ->cascadeOnDelete();
            $table->foreignId('balance_id')
                ->nullable()
                ->constrained('affiliate_balances')
                ->nullOnDelete();
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('XOF');
            $table->string('method', 30);
            $table->string('account', 191)->nullable();
            $table->string('status', 20)->default('requested')->index(); // requested | approved | paid | rejected
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['affiliate_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affiliate_payouts');
        Schema::dropIfExists('affiliate_commissions');
        Schema::dropIfExists('affiliate_balances');
        Schema::dropIfExists('affiliates');
    }
};