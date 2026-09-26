<?php

namespace App\Services;

use App\Models\OrderItem;
use App\Models\Seller;
use App\Models\SellerExpense;
use App\Models\SellerTransaction;
use App\Support\Media;
use Carbon\Carbon;

/**
 * Module Comptabilité vendeur — rapport périodisé construit exclusivement à
 * partir des écritures réelles (SellerTransaction) et des dépenses saisies
 * par le vendeur (SellerExpense). Aucun chiffre fictif : le bénéfice estimé
 * est net des ventes (brut − commission − frais) moins les dépenses.
 */
class SellerAccountingService
{
    /** Catégories de dépenses stables (clés machine → libellés i18n). */
    public const CATEGORIES = [
        'supplies',
        'transport',
        'marketing',
        'salaries',
        'rent',
        'equipment',
        'fees',
        'other',
    ];

    public function report(Seller $seller, Carbon $from, Carbon $to): array
    {
        $from = $from->copy()->startOfDay();
        $to = $to->copy()->endOfDay();

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'balance' => $this->balance($seller),
            'summary' => $this->summary($seller, $from, $to),
            'goal' => $this->goal($seller),
            'evolution' => $this->evolution($seller, $from, $to),
            'expenses_by_category' => $this->expensesByCategory($seller, $from, $to),
            'top_products' => $this->topProducts($seller, $from, $to),
            'sales' => $this->sales($seller, $from, $to),
            'expenses' => $this->expenses($seller, $from, $to),
        ];
    }

    private function balance(Seller $seller): array
    {
        $balance = $seller->balance()->firstOrCreate(['currency' => $seller->currency]);

        return [
            'available' => (int) $balance->amount_available,
            'pending' => (int) $balance->amount_pending,
            'currency' => $balance->currency,
        ];
    }

    /**
     * Tableau de synthèse : ventes (brut, commission, frais, net), dépenses
     * et bénéfice estimé = net des ventes − dépenses.
     */
    private function summary(Seller $seller, Carbon $from, Carbon $to): array
    {
        $sales = SellerTransaction::query()
            ->where('seller_id', $seller->getKey())
            ->where('type', 'sale')
            ->whereBetween('created_at', [$from, $to]);

        $expenses = (int) SellerExpense::query()
            ->where('seller_id', $seller->getKey())
            ->whereBetween('incurred_at', [$from, $to])
            ->sum('amount_minor');

        $gross = (int) (clone $sales)->sum('amount_minor');
        $commissions = (int) (clone $sales)->sum('commission_minor');
        $fees = (int) (clone $sales)->sum('fee_minor');
        $net = (int) (clone $sales)->sum('net_minor');

        return [
            'sales_count' => (int) (clone $sales)->count(),
            'sales_gross' => $gross,
            'commissions' => $commissions,
            'fees' => $fees,
            'net_sales' => $net,
            'expenses' => $expenses,
            'benefit' => $net - $expenses,
        ];
    }

    /** Objectif de ventes du mois courant : cible vs CA brut déjà réalisé. */
    private function goal(Seller $seller): array
    {
        $monthly = (int) $seller->monthly_goal_minor;
        $achieved = (int) SellerTransaction::query()
            ->where('seller_id', $seller->getKey())
            ->where('type', 'sale')
            ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('amount_minor');

        return [
            'monthly_minor' => $monthly,
            'achieved_minor' => $achieved,
            'progress_pct' => $monthly > 0 ? min(100, (int) round($achieved / $monthly * 100)) : 0,
        ];
    }

    /**
     * Série temporelle revenus / dépenses sur la période : pas quotidien si
     * ≤ 8 jours, hebdomadaire si ≤ 10 semaines, mensuel si ≤ 18 mois, sinon
     * annuel. Les trous sont remplis à zéro pour un graphique régulier.
     */
    private function evolution(Seller $seller, Carbon $from, Carbon $to): array
    {
        $granularity = $this->granularity($from, $to);
        $buckets = $this->emptyBuckets($from, $to, $granularity);

        $expr = match ($granularity) {
            'day' => "DATE_FORMAT(created_at, '%Y-%m-%d')",
            'week' => "DATE_FORMAT(created_at, '%x-%v')",
            'month' => "DATE_FORMAT(created_at, '%Y-%m')",
            default => "DATE_FORMAT(created_at, '%Y')",
        };

        $revenues = SellerTransaction::query()
            ->where('seller_id', $seller->getKey())
            ->where('type', 'sale')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("{$expr} as k")
            ->selectRaw('SUM(amount_minor) as total')
            ->groupBy('k')
            ->get();

        foreach ($revenues as $row) {
            if (isset($buckets[$row->k])) {
                $buckets[$row->k]['revenue'] = (int) $row->total;
            }
        }

        $spent = SellerExpense::query()
            ->where('seller_id', $seller->getKey())
            ->whereBetween('incurred_at', [$from, $to])
            ->selectRaw("{$expr} as k")
            ->selectRaw('SUM(amount_minor) as total')
            ->groupBy('k')
            ->get();

        foreach ($spent as $row) {
            if (isset($buckets[$row->k])) {
                $buckets[$row->k]['expenses'] = (int) $row->total;
            }
        }

        return array_values($buckets);
    }

    private function granularity(Carbon $from, Carbon $to): string
    {
        $days = (int) $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay()) + 1;

        return match (true) {
            $days <= 8 => 'day',
            $days <= 70 => 'week',
            $days <= 540 => 'month',
            default => 'year',
        };
    }

    private function emptyBuckets(Carbon $from, Carbon $to, string $granularity): array
    {
        $buckets = [];

        switch ($granularity) {
            case 'day':
                for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
                    $buckets[$d->format('Y-m-d')] = ['label' => $d->format('d M'), 'revenue' => 0, 'expenses' => 0];
                }
                break;
            case 'week':
                for ($d = $from->copy()->startOfWeek(); $d->lte($to); $d->addWeek()) {
                    $buckets[$d->format('o-W')] = ['label' => $d->format('d M'), 'revenue' => 0, 'expenses' => 0];
                }
                break;
            case 'month':
                for ($d = $from->copy()->startOfMonth(); $d->lte($to); $d->addMonth()) {
                    $buckets[$d->format('Y-m')] = ['label' => $d->format('M y'), 'revenue' => 0, 'expenses' => 0];
                }
                break;
            default:
                for ($year = (int) $from->year; $year <= (int) $to->year; $year++) {
                    $buckets[(string) $year] = ['label' => (string) $year, 'revenue' => 0, 'expenses' => 0];
                }
        }

        return $buckets;
    }

    private function expensesByCategory(Seller $seller, Carbon $from, Carbon $to): array
    {
        return SellerExpense::query()
            ->where('seller_id', $seller->getKey())
            ->whereBetween('incurred_at', [$from, $to])
            ->select('category')
            ->selectRaw('SUM(amount_minor) as total_minor')
            ->selectRaw('COUNT(*) as `count`')
            ->groupBy('category')
            ->get()
            ->map(fn ($row) => [
                'category' => $row->category,
                'total_minor' => (int) $row->total_minor,
                'count' => (int) $row->count,
            ])
            ->sortByDesc('total_minor')
            ->values()
            ->all();
    }

    /** Produits les plus rentables de la période (via les ventes réelles). */
    private function topProducts(Seller $seller, Carbon $from, Carbon $to): array
    {
        $orderIds = SellerTransaction::query()
            ->where('seller_id', $seller->getKey())
            ->where('type', 'sale')
            ->whereNotNull('order_id')
            ->whereBetween('created_at', [$from, $to])
            ->pluck('order_id');

        if ($orderIds->isEmpty()) {
            return [];
        }

        return OrderItem::query()
            ->whereIn('order_id', $orderIds)
            ->get(['product_id', 'quantity', 'total_minor', 'product_snapshot'])
            ->groupBy('product_id')
            ->map(function ($group) {
                $first = $group->first();
                $snapshot = $first->product_snapshot ?? [];

                return [
                    'product_id' => $first->product_id,
                    'name' => $snapshot['name'] ?? ('Produit #'.$first->product_id),
                    'image' => Media::url($snapshot['image'] ?? null),
                    'quantity' => (int) $group->sum('quantity'),
                    'revenue_minor' => (int) $group->sum('total_minor'),
                ];
            })
            ->sortByDesc('revenue_minor')
            ->take(5)
            ->values()
            ->all();
    }

    /** Ventes détaillées de la période (montant, commission, frais, net, réf.). */
    private function sales(Seller $seller, Carbon $from, Carbon $to): array
    {
        return SellerTransaction::query()
            ->where('seller_id', $seller->getKey())
            ->where('type', 'sale')
            ->whereBetween('created_at', [$from, $to])
            ->with('order')
            ->orderByDesc('created_at')
            ->limit(25)
            ->get()
            ->map(fn ($tx) => [
                'id' => $tx->id,
                'order_number' => $tx->order?->order_number,
                'gross' => (int) $tx->amount_minor,
                'commission' => (int) $tx->commission_minor,
                'fee' => (int) $tx->fee_minor,
                'net' => (int) $tx->net_minor,
                'date' => $tx->created_at?->toDateString(),
            ])
            ->values()
            ->all();
    }

    private function expenses(Seller $seller, Carbon $from, Carbon $to): array
    {
        return SellerExpense::query()
            ->where('seller_id', $seller->getKey())
            ->whereBetween('incurred_at', [$from, $to])
            ->orderByDesc('incurred_at')
            ->limit(20)
            ->get()
            ->map(fn ($expense) => [
                'id' => $expense->id,
                'amount_minor' => (int) $expense->amount_minor,
                'category' => $expense->category,
                'incurred_at' => $expense->incurred_at?->toDateString(),
                'description' => $expense->description,
                'receipt_url' => Media::url($expense->receipt_path),
            ])
            ->values()
            ->all();
    }
}