<?php

namespace App\Services;

use App\Models\BusinessConfig;
use Illuminate\Support\Facades\Cache;

/**
 * Règles de commerce configurables (commissions, frais, limites, promotion).
 *
 * Les valeurs sont stockées en base (table business_configs) et mises en cache
 * pour le cycle de vie d'une requête. Aucune règle économique ne doit être
 * codée en dur ailleurs dans le code.
 */
class ConfigService
{
    public const CACHE_KEY = 'yaxantu.business_config';

    private array $rows = [];

    private bool $loaded = false;

    /**
     * Charge l'ensemble des règles (paresseux) depuis le cache, puis la base.
     *
     * @return array<string, mixed>
     */
    public function all(): array
    {
        if ($this->loaded) {
            return $this->rows;
        }

        $this->rows = Cache::rememberForever(self::CACHE_KEY, function () {
            $rows = BusinessConfig::pluck('value', 'key')->all();

            return array_map(fn ($value) => $value[0] ?? null, $rows);
        });

        $this->loaded = true;

        return $this->rows;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    public function int(string $key, int $default = 0): int
    {
        return (int) ($this->get($key, $default));
    }

    public function bool(string $key, bool $default = false): bool
    {
        return (bool) ($this->get($key, $default));
    }

    public function set(string $key, mixed $value, ?string $description = null): void
    {
        BusinessConfig::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'description' => $description ?? $key],
        );

        $this->forget();
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->rows = [];
        $this->loaded = false;
    }

    // ---------------------------------------------------- Raccourcis typés

    public function currency(): string
    {
        return (string) $this->get('commerce.currency', 'XOF');
    }

    /** Commission globale par défaut, en points de base. 1 % = 100 bps. */
    public function defaultCommissionBps(): int
    {
        return $this->int('commission.default_rate_bps', 100);
    }

    public function payoutMinimum(): int
    {
        return $this->int('payout.min_amount_minor', 1000);
    }

    public function orderPaymentTimeoutMinutes(): int
    {
        return $this->int('order.payment_timeout_minutes', 30);
    }

    // ── Programme influenceurs ─────────────────────────────────────────

    /** Taux de commission d'un influenceur par défaut (l'admin peut le surcharger). */
    public function affiliateCommissionDefaultBps(): int
    {
        return $this->int('affiliate.commission.default_bps', 500);
    }

    /** Plafond global de commission sur une seule commande (null = illimité). */
    public function affiliateCommissionMaxPerOrderMinor(): ?int
    {
        $value = $this->get('affiliate.commission.max_per_order_minor', null);

        return $value === null ? null : (int) $value;
    }

    public function affiliatePayoutMinimum(): int
    {
        return $this->int('affiliate.payout.min_amount_minor', 1000);
    }

    public function affiliatePayoutMaximum(): int
    {
        return $this->int('affiliate.payout.max_amount_minor', 0);
    }
}