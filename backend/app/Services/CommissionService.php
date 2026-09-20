<?php

namespace App\Services;

use App\Models\Commission;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Seller;

/**
 * Calcul et enregistrement des commissions (cahier des charges §37).
 *
 * Phase 3 — paliers dégressifs selon le volume mensuel réalisé par le vendeur :
 * le taux baisse quand le volume monte (incitation à vendre plus). Aucun taux
 * n'est codé en dur : il est configurable via business_configs et peut être
 * surchargé par vendeur (commission_override_bps).
 */
class CommissionService
{
    public function __construct(
        private readonly ConfigService $config,
    ) {}

    /**
     * Palier de commission pour le volume mensuel (30 jours glissants) du vendeur.
     *
     * @return list<array{min: int, bps: int}>
     */
    public function tiers(): array
    {
        $default = [
            ['min' => 0, 'bps' => $this->config->defaultCommissionBps()],

        ];

        $raw = $this->config->get('commission.tiers', $default);
        $tiers = is_array($raw) ? array_values($raw) : [];

        if (empty($tiers)) {
            return $default;
        }

        usort($tiers, fn ($a, $b) => (int) ($a['min'] ?? 0) <=> (int) ($b['min'] ?? 0));

        return $tiers;
    }

    /**
     * Volume mensuel réalisé (sous-totaux des articles livrés, 30 J glissants).
     */
    public function monthlyVolumeMinor(Seller $seller): int
    {
        return (int) OrderItem::query()
            ->where('seller_id', $seller->id)
            ->whereHas('order', function ($q) {
                $q->where('status', 'delivered')
                    ->where('completed_at', '>', now()->subDays(30));
            })
            ->sum('total_minor');
    }

    public function rateBpsFor(Seller $seller): int
    {
        if ($seller->commission_override_bps !== null) {
            return (int) $seller->commission_override_bps;
        }

        $volume = $this->monthlyVolumeMinor($seller);
        $selected = null;

        foreach ($this->tiers() as $tier) {
            if ($volume >= (int) ($tier['min'] ?? 0)) {
                $selected = (int) ($tier['bps'] ?? $this->config->defaultCommissionBps());
            }
        }

        return $selected ?? $this->config->defaultCommissionBps();
    }

    public function amountFor(int $subtotalMinor, Seller $seller): int
    {
        $bps = $this->rateBpsFor($seller);

        return (int) round($subtotalMinor * $bps / 10000);
    }

    /**
     * Enregistre une commission pour une ligne de commande.
     */
    public function recordForItem(Order $order, object $item): Commission
    {
        $seller = Seller::query()->find($item->seller_id);

        $rateBps = $seller?->commission_override_bps ?? $this->config->defaultCommissionBps();

        return Commission::create([
            'seller_id' => $item->seller_id,
            'order_id' => $order->id,
            'order_item_id' => $item->getKey(),
            'amount_minor' => $this->amountFor((int) $item->total_minor, $seller),
            'currency' => $item->unit_price_currency ?: $order->currency,
            'rate_bps' => $rateBps,
            'type' => 'transaction',
            'status' => 'pending',
        ]);
    }
}