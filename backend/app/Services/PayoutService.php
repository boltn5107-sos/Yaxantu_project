<?php

namespace App\Services;

use App\Enums\AuditEvent;
use App\Models\Notification;
use App\Models\Seller;
use App\Models\SellerBalance;
use App\Models\SellerPayout;
use App\Models\SellerTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Versements au vendeur (phase 3) : retrait manuel à la demande et prochain
 * versement automatique programmé. Le modèle est 100 % à la performance :
 * aucun frais tant qu'aucune vente n'a été conclue.
 */
class PayoutService
{
    public function __construct(
        private readonly ConfigService $config,
    ) {}

    /**
     * Demande de retrait manuel (Wave / Orange Money / compte bancaire).
     *
     * @throws RuntimeException si le montant dépasse le solde disponible
     */
    public function request(Seller $seller, int $amountMinor, string $method): SellerPayout
    {
        $balance = $seller->balance()->firstOrCreate(['currency' => $seller->currency]);

        $minimum = $this->config->payoutMinimum();
        $maximum = $this->config->int('payout.max_amount_minor', 0);

        if ($amountMinor < $minimum) {
            throw new RuntimeException('Le montant minimal de retrait est de '.number_format($minimum).' '.$seller->currency.'.');
        }

        if ($maximum > 0 && $amountMinor > $maximum) {
            throw new RuntimeException('Ce montant dépasse le retrait maximal autorisé.');
        }

        if ($balance->amount_available < $amountMinor) {
            throw new RuntimeException('Solde disponible insuffisant.');
        }

        $payout = null;

        DB::transaction(function () use ($seller, $balance, $amountMinor, $method, &$payout) {
            $balance->decrement('amount_available', $amountMinor);

            $payout = SellerPayout::create([
                'seller_id' => $seller->id,
                'balance_id' => $balance->id,
                'amount_minor' => $amountMinor,
                'currency' => $seller->currency,
                'method' => $method,
                'status' => 'requested',
                'requested_at' => now(),
            ]);

            SellerTransaction::create([
                'seller_id' => $seller->id,
                'type' => 'payout',
                'direction' => 'out',
                'amount_minor' => $amountMinor,
                'currency' => $seller->currency,
                'commission_minor' => 0,
                'fee_minor' => $this->config->int('payout.fee_bps', 0) > 0
                    ? (int) round($amountMinor * $this->config->int('payout.fee_bps', 0) / 10000)
                    : 0,
                'net_minor' => $amountMinor,
                'payout_id' => $payout->id,
                'description' => 'Retrait '.$method.' demandé',
            ]);
        });

        Notification::create([
            'user_id' => $seller->user_id,
            'type' => 'payout.requested',
            'title' => 'Retrait demandé',
            'message' => 'Votre retrait de '.number_format($amountMinor).' '.$seller->currency.' a été enregistré.',
            'action_url' => '/seller/finances',
            'action_text' => 'Voir mes versements',
            'priority' => 'normal',
        ]);

        AuditService::log(AuditEvent::PaymentInitiated, $payout, ['amount_minor' => $amountMinor, 'method' => $method]);

        return $payout;
    }

    /**
     * Prochain versement automatique : le solde en attente est versé selon le
     * rythme de la plateforme (chaque jour à défaut).
     *
     * @return array{date: string, amount_minor: int}
     */
    public function nextScheduled(Seller $seller): array
    {
        $balance = SellerBalance::query()->where('seller_id', $seller->id)->first();

        $days = max(1, $this->config->int('payout.auto_schedule_days', 1));

        return [
            'date' => now()->addDays($days)->startOfDay()->toIso8601String(),
            'amount_minor' => (int) ($balance?->amount_pending ?? 0),
        ];
    }

    // ── Supervision (administration) ────────────────────────────────────

    /**
     * Approuver un retrait : il est ensuite payé effectivement ou rejeté.
     *
     * @throws RuntimeException si le retrait n'est pas en attente
     */
    public function approve(SellerPayout $payout, User $by): SellerPayout
    {
        if ($payout->status !== 'requested') {
            throw new RuntimeException('Seul un retrait en attente peut être approuvé.');
        }

        $payout->forceFill([
            'status' => 'approved',
            'processed_by' => $by->id,
        ])->save();

        AuditService::log(AuditEvent::PayoutApproved, $payout, ['by' => $by->email]);

        return $payout;
    }

    /**
     * Marquer un retrait approuvé comme payé.
     *
     * @throws RuntimeException si le retrait n'est pas approuvé
     */
    public function markPaid(SellerPayout $payout, User $by, ?string $reference = null): SellerPayout
    {
        if ($payout->status !== 'approved') {
            throw new RuntimeException('Un retrait doit être approuvé avant d\'être payé.');
        }

        $payout->forceFill([
            'status' => 'paid',
            'processed_at' => now(),
            'processed_by' => $by->id,
            'transaction_id' => $reference ?? null,
        ])->save();

        Notification::create([
            'user_id' => $payout->seller->user_id,
            'type' => 'payout.paid',
            'title' => 'Retrait payé',
            'message' => 'Votre retrait de '.number_format($payout->amount_minor).' '.$payout->currency.' a été envoyé ('.strtoupper($payout->method).').',
            'data' => ['payout_id' => $payout->id],
            'action_url' => '/seller/finances',
            'action_text' => 'Voir mes versements',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::PayoutPaid, $payout, ['by' => $by->email, 'reference' => $reference]);

        return $payout;
    }

    /**
     * Rejeter un retrait en attente : le montant est recrédité sur le solde
     * disponible et une transaction de crédit est enregistrée.
     *
     * @throws RuntimeException si le retrait n'est pas en attente
     */
    public function reject(SellerPayout $payout, User $by, ?string $reason = null): SellerPayout
    {
        if ($payout->status !== 'requested') {
            throw new RuntimeException('Seul un retrait en attente peut être rejeté.');
        }

        DB::transaction(function () use ($payout, $by, $reason) {
            $balance = $payout->balance
                ?? $payout->seller->balance()->firstOrCreate(['currency' => $payout->currency]);

            $balance->increment('amount_available', $payout->amount_minor);

            $payout->forceFill([
                'status' => 'rejected',
                'processed_at' => now(),
                'processed_by' => $by->id,
                'notes' => $reason ?? null,
            ])->save();

            SellerTransaction::create([
                'seller_id' => $payout->seller_id,
                'type' => 'payout_reversal',
                'direction' => 'in',
                'amount_minor' => $payout->amount_minor,
                'currency' => $payout->currency,
                'commission_minor' => 0,
                'fee_minor' => 0,
                'net_minor' => $payout->amount_minor,
                'payout_id' => $payout->id,
                'description' => $reason
                    ? 'Retrait rejeté : '.$reason
                    : 'Retrait rejeté, montant recrédité',
            ]);
        });

        Notification::create([
            'user_id' => $payout->seller->user_id,
            'type' => 'payout.rejected',
            'title' => 'Retrait rejeté',
            'message' => $reason
                ? 'Votre retrait de '.number_format($payout->amount_minor).' '.$payout->currency.' a été rejeté : '.$reason
                : 'Votre retrait de '.number_format($payout->amount_minor).' '.$payout->currency.' a été rejeté.',
            'data' => ['payout_id' => $payout->id],
            'action_url' => '/seller/finances',
            'action_text' => 'Voir mes versements',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::PayoutRejected, $payout, ['by' => $by->email, 'reason' => $reason]);

        return $payout;
    }
}