<?php

namespace App\Services;

use App\Enums\AuditEvent;
use App\Models\Affiliate;
use App\Models\AffiliateBalance;
use App\Models\AffiliateCommission;
use App\Models\AffiliatePayout;
use App\Models\Notification;
use App\Models\Order;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Programme influenceurs (affiliation).
 *
 * Sécurité des sommes :
 *  - le montant de commission est toujours calculé côté serveur, à la livraison ;
 *  - la commission est plafonnée (par commande et mensuellement) avant crédit ;
 *  - elle reste "en attente" jusqu'à l'approbation d'un administrateur ;
 *  - un retrait est débité du solde disponible puis soumis à validation admin ;
 *  - chaque transition d'argent est journalisée dans audit_logs.
 */
class AffiliateService
{
    public function __construct(
        private readonly ConfigService $config,
    ) {}

    // ── Profil ──────────────────────────────────────────────────────────

    /**
     * Candidature d'un utilisateur au programme influenceur (statut "draft").
     */
    public function apply(User $user, array $data): Affiliate
    {
        $existing = Affiliate::query()->where('user_id', $user->getKey())->first();

        if ($existing !== null) {
            throw new RuntimeException('Vous avez déjà une candidature influenceur.');
        }

        return DB::transaction(function () use ($user, $data) {
            $affiliate = Affiliate::create([
                'user_id' => $user->getKey(),
                'handle' => $data['handle'],
                'public_name' => $data['public_name'] ?? null,
                'status' => 'draft',
                'motivation' => $data['motivation'] ?? null,
                'payout_method' => $data['payout_method'] ?? null,
                'payout_account' => $data['payout_account'] ?? null,
                'payout_email' => $data['payout_email'] ?? null,
            ]);

            AuditService::log(AuditEvent::AffiliateApplied, $affiliate);

            return $affiliate;
        });
    }

    /**
     * Activation par un admin : crée (ou retourne) le code promo lié.
     */
    public function activate(Affiliate $affiliate, array $promoData, User $by): Affiliate
    {
        if ($affiliate->status !== 'draft' && ! $affiliate->isSuspended()) {
            throw new RuntimeException('Cette candidature ne peut pas être activée.');
        }

        DB::transaction(function () use ($affiliate, $promoData, $by) {
            $code = $this->ensureCode($affiliate, $promoData);

            $code->forceFill([
                'discount_type' => $promoData['discount_type'] ?? 'percent',
                'discount_value' => (int) ($promoData['discount_value'] ?? 10),
                'is_active' => true,
                'max_discount_per_order_minor' => $promoData['max_discount_per_order_minor'] ?? null,
                'per_user_limit' => $promoData['per_user_limit'] ?? null,
                'max_discount_total_minor' => $promoData['max_discount_total_minor'] ?? null,
                'starts_at' => $promoData['starts_at'] ?? now(),
            ])->save();

            $affiliate->forceFill([
                'status' => 'active',
                'approved_at' => now(),
            ])->save();

            AuditService::log(AuditEvent::AffiliateApproved, $affiliate, ['by' => $by->email]);
        });

        $affiliate->unsetRelation('promoCodes');

        return $affiliate;
    }

    /**
     * Bascule actif ↔ suspendu en synchronisant l'état des codes promo.
     */
    public function setStatus(Affiliate $affiliate, string $status, User $by): Affiliate
    {
        if ($affiliate->status === $status) {
            return $affiliate;
        }

        DB::transaction(function () use ($affiliate, $status, $by) {
            $affiliate->forceFill(['status' => $status])->save();

            if ($status === 'suspended') {
                $affiliate->promoCodes()->update(['is_active' => false]);
            }

            if ($status === 'active') {
                $affiliate->promoCodes()->withTrashed()->update(['is_active' => true]);
            }

            AuditService::log(AuditEvent::AffiliateStatusChanged, $affiliate, ['status' => $status, 'by' => $by->email]);
        });

        return $affiliate;
    }

    /**
     * Met à jour les réglages de commission et de versement.
     */
    public function updateSettings(Affiliate $affiliate, array $data): Affiliate
    {
        $affiliate->update($data);

        AuditService::log(AuditEvent::AffiliateUpdated, $affiliate, [
            'commission_rate_bps' => $affiliate->commission_rate_bps,
            'monthly_cap_minor' => $affiliate->monthly_cap_minor,
        ]);

        return $affiliate;
    }

    /**
     * Crée le code promo lié à l'influenceur (une seule fois).
     */
    private function ensureCode(Affiliate $affiliate, array $data): PromoCode
    {
        $existing = PromoCode::query()->where('affiliate_id', $affiliate->id)->first();

        if ($existing !== null) {
            return $existing;
        }

        $code = $data['code'] ?? strtoupper(Str::slug($affiliate->handle ?: 'INFLU').'-'.Str::upper(Str::random(4)));

        return PromoCode::create([
            'code' => $code,
            'affiliate_id' => $affiliate->id,
            'description' => 'Code influenceur — '.($affiliate->public_name ?: $affiliate->handle),
            'discount_type' => $data['discount_type'] ?? 'percent',
            'discount_value' => (int) ($data['discount_value'] ?? 10),
            'is_active' => true,
        ]);
    }

    // ── Commission ──────────────────────────────────────────────────────

    public function rateBpsFor(Affiliate $affiliate): int
    {
        return (int) ($affiliate->commission_rate_bps ?? $this->config->affiliateCommissionDefaultBps());
    }

    /**
     * Cumul mensuel des commissions en cours (hors annulées).
     */
    public function monthlyTotalCommissions(Affiliate $affiliate): int
    {
        return (int) AffiliateCommission::query()
            ->where('affiliate_id', $affiliate->id)
            ->where('status', '!=', 'reversed')
            ->whereDate('created_at', '>=', now()->startOfMonth())
            ->sum('amount_minor');
    }

    /**
     * Enregistre la commission d'une commande livrée (méthode idempotente).
     */
    public function recordCommissionForOrder(Order $order): ?AffiliateCommission
    {
        if ($order->promo_code_id === null) {
            return null;
        }

        $promo = PromoCode::query()->whereKey($order->promo_code_id)->first();

        if ($promo === null || $promo->affiliate_id === null) {
            return null;
        }

        $affiliate = $promo->affiliate;

        if ($affiliate === null || ! $affiliate->isActive()) {
            return null;
        }

        if (AffiliateCommission::query()->where('order_id', $order->id)->exists()) {
            return null;
        }

        $rateBps = $this->rateBpsFor($affiliate);

        $base = max(0, (int) $order->subtotal_minor - (int) $order->discount_minor);
        $amount = (int) round($base * $rateBps / 10000);

        // Plafond mensuel de commission accordée à cet influenceur.
        $maxPerOrder = $this->config->affiliateCommissionMaxPerOrderMinor();
        if ($maxPerOrder !== null) {
            $amount = min($amount, $maxPerOrder);
        }

        if ($affiliate->monthly_cap_minor !== null) {
            $remaining = max(0, (int) $affiliate->monthly_cap_minor - $this->monthlyTotalCommissions($affiliate));
            $amount = min($amount, $remaining);
        }

        $commission = null;

        DB::transaction(function () use ($affiliate, $promo, $order, $base, $rateBps, $amount, &$commission) {
            if ($amount > 0) {
                $commission = AffiliateCommission::create([
                    'affiliate_id' => $affiliate->id,
                    'promo_code_id' => $promo->id,
                    'order_id' => $order->id,
                    'base_amount_minor' => $base,
                    'rate_bps' => $rateBps,
                    'amount_minor' => $amount,
                    'currency' => $order->currency,
                    'status' => 'pending',
                ]);

                $this->balance($affiliate)->increment('amount_pending', $amount);

                AuditService::log(AuditEvent::AffiliateCommissionCreated, $commission, [
                    'order_number' => $order->order_number,
                    'amount_minor' => $amount,
                ]);
            }
        });

        return $commission;
    }

    /**
     * Invalide les commissions d'une commande annulée / remboursée.
     */
    public function reverseCommissionsForOrder(Order $order): void
    {
        $commissions = AffiliateCommission::query()->where('order_id', $order->id)->get();

        foreach ($commissions as $commission) {
            $this->reverseCommission($commission);
        }
    }

    /**
     * Approbation admin : l'argent passe de "en attente" à "disponible".
     */
    public function approveCommission(AffiliateCommission $commission, User $by): AffiliateCommission
    {
        if ($commission->status !== 'pending') {
            throw new RuntimeException('Cette commission n\'est pas en attente.');
        }

        DB::transaction(function () use ($commission, $by) {
            $commission->forceFill([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $by->getKey(),
            ])->save();

            $balance = $this->balance($commission->affiliate);
            $balance->decrement('amount_pending', $commission->amount_minor);
            $balance->increment('amount_available', $commission->amount_minor);

            AuditService::log(AuditEvent::AffiliateCommissionApproved, $commission, [
                'amount_minor' => $commission->amount_minor,
                'by' => $by->email,
            ]);
        });

        return $commission;
    }

    /**
     * Annulation admin d'une commission (fraude / litige) : crédit retiré.
     */
    public function reverseCommission(AffiliateCommission $commission): AffiliateCommission
    {
        if ($commission->status === 'reversed') {
            return $commission;
        }

        DB::transaction(function () use ($commission) {
            $previous = $commission->status;
            $commission->forceFill(['status' => 'reversed'])->save();

            $balance = $this->balance($commission->affiliate);

            if ($previous === 'pending') {
                $balance->decrement('amount_pending', $commission->amount_minor);
            }

            if ($previous === 'approved') {
                $balance->decrement('amount_available', $commission->amount_minor);
            }

            AuditService::log(AuditEvent::AffiliateCommissionReversed, $commission, [
                'amount_minor' => $commission->amount_minor,
                'from' => $previous,
            ]);
        });

        return $commission;
    }

    // ── Retraits ────────────────────────────────────────────────────────

    /**
     * Demande de retrait : le montant est débité du solde disponible puis
     * soumis à l'approbation d'un administrateur.
     */
    public function requestPayout(Affiliate $affiliate, int $amountMinor, string $method): AffiliatePayout
    {
        if (! $affiliate->isActive()) {
            throw new RuntimeException('Votre profil influenceur n\'est pas actif.');
        }

        $balance = $affiliate->balance()->firstOrCreate(['currency' => 'XOF']);

        $minimum = $this->config->affiliatePayoutMinimum();
        $maximum = $this->config->affiliatePayoutMaximum();

        if ($amountMinor < $minimum) {
            throw new RuntimeException('Le montant minimal de retrait est de '.number_format($minimum).' FCFA.');
        }

        if ($maximum > 0 && $amountMinor > $maximum) {
            throw new RuntimeException('Ce montant dépasse le retrait maximal autorisé.');
        }

        if ((int) $balance->amount_available < $amountMinor) {
            throw new RuntimeException('Solde disponible insuffisant.');
        }

        $payout = null;

        DB::transaction(function () use ($affiliate, $balance, $amountMinor, $method, &$payout) {
            $balance->decrement('amount_available', $amountMinor);

            $payout = AffiliatePayout::create([
                'affiliate_id' => $affiliate->id,
                'balance_id' => $balance->id,
                'amount_minor' => $amountMinor,
                'currency' => $balance->currency,
                'method' => $method,
                'account' => $affiliate->payout_account,
                'status' => 'requested',
                'requested_at' => now(),
            ]);

            AuditService::log(AuditEvent::AffiliatePayoutRequested, $payout, [
                'amount_minor' => $amountMinor,
                'method' => $method,
            ]);
        });

        Notification::create([
            'user_id' => $affiliate->user_id,
            'type' => 'affiliate.payout.requested',
            'title' => 'Retrait demandé',
            'message' => 'Votre retrait de '.number_format($amountMinor).' '.$balance->currency.' est en cours de vérification.',
            'action_url' => '/influencer',
            'action_text' => 'Mon espace influenceur',
            'priority' => 'normal',
        ]);

        return $payout;
    }

    public function approvePayout(AffiliatePayout $payout, User $by): AffiliatePayout
    {
        if ($payout->status !== 'requested') {
            throw new RuntimeException('Ce retrait n\'est pas en attente.');
        }

        $payout->forceFill([
            'status' => 'approved',
            'approved_at' => now(),
            'processed_by' => $by->getKey(),
        ])->save();

        AuditService::log(AuditEvent::AffiliatePayoutApproved, $payout, ['by' => $by->email]);

        return $payout;
    }

    public function payPayout(AffiliatePayout $payout, User $by, ?string $reference = null): AffiliatePayout
    {
        if (! in_array($payout->status, ['approved', 'requested'], true)) {
            throw new RuntimeException('Ce retrait doit d\'abord être approuvé.');
        }

        $payout->forceFill([
            'status' => 'paid',
            'paid_at' => now(),
            'processed_by' => $by->getKey(),
            'reference' => $reference,
        ])->save();

        AuditService::log(AuditEvent::AffiliatePayoutPaid, $payout, [
            'amount_minor' => $payout->amount_minor,
            'reference' => $reference,
            'by' => $by->email,
        ]);

        return $payout;
    }

    public function rejectPayout(AffiliatePayout $payout, User $by, ?string $reason = null): AffiliatePayout
    {
        if ($payout->status !== 'requested') {
            throw new RuntimeException('Ce retrait ne peut pas être rejeté.');
        }

        DB::transaction(function () use ($payout, $by, $reason) {
            $payout->forceFill([
                'status' => 'rejected',
                'processed_by' => $by->getKey(),
                'note' => $reason,
            ])->save();

            // Le montant est recrédité sur le solde disponible.
            $this->balance($payout->affiliate)->increment('amount_available', $payout->amount_minor);

            AuditService::log(AuditEvent::AffiliatePayoutRejected, $payout, [
                'amount_minor' => $payout->amount_minor,
                'reason' => $reason,
                'by' => $by->email,
            ]);
        });

        return $payout;
    }

    // ── Statistiques ────────────────────────────────────────────────────

    public function stats(Affiliate $affiliate): array
    {
        $code = $affiliate->promoCodes()->latest('id')->first();

        return [
            'orders_count' => (int) Order::query()
                ->where('promo_code_id', $code?->id)
                ->whereNotIn('status', ['cancelled', 'refunded'])
                ->count(),
            'sales_minor' => (int) Order::query()
                ->where('promo_code_id', $code?->id)
                ->whereNotIn('status', ['cancelled', 'refunded'])
                ->sum('subtotal_minor'),
            'discount_granted_minor' => (int) Order::query()
                ->where('promo_code_id', $code?->id)
                ->whereNotIn('status', ['cancelled', 'refunded'])
                ->sum('discount_minor'),
            'commissions' => [
                'pending' => (int) $affiliate->commissions()->where('status', 'pending')->sum('amount_minor'),
                'approved' => (int) $affiliate->commissions()->where('status', 'approved')->sum('amount_minor'),
                'reversed' => (int) $affiliate->commissions()->where('status', 'reversed')->sum('amount_minor'),
                'count' => (int) $affiliate->commissions()->count(),
            ],
            'monthly_total' => $this->monthlyTotalCommissions($affiliate),
        ];
    }

    public function balance(Affiliate $affiliate): AffiliateBalance
    {
        return $affiliate->balance()->firstOrCreate(['currency' => 'XOF']);
    }

    public function maskAccount(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Str::mask($value, '█', 2, max(0, mb_strlen($value) - 4));
    }
}