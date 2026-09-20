<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Seller;

/**
 * Analyse vendeur (phase 3) — gros chiffres et pictogrammes, zéro jargon.
 * Avec variation vs période précédente, ventes par jour, top produits,
 * taux de clients fidèles et évolution du score de confiance expliquée.
 */
class AnalyticsService
{
    private function daysFor(string $period): int
    {
        return match ($period) {
            '7d' => 7,
            '90d' => 90,
            default => 30,
        };
    }

    public function report(Seller $seller, string $period = '30d'): array
    {
        $days = $this->daysFor($period);

        $revenue = $this->revenueReport($seller, $days);
        $completed = $this->completedOrders($seller, $days);

        return [
            'period' => $period,
            'revenue' => $revenue,
            'sales_per_day' => $this->salesPerDay($seller, $days),
            'top_products' => $this->topProducts($seller, $days),
            'repeat_customers' => $this->repeatCustomers($seller, $days, $completed),
            'trust' => [
                'score' => (int) $seller->trust_score,
                'events' => $seller->trustScoreEvents()
                    ->orderByDesc('created_at')
                    ->limit(6)
                    ->get()
                    ->map(fn ($e) => [
                        'date' => $e->created_at?->toIso8601String(),
                        'delta' => (int) $e->delta,
                        'score' => (int) $e->score_after,
                        'reason' => $e->reason,
                    ])
                    ->values()
                    ->all(),
            ],
        ];
    }

    private function completedOrders(Seller $seller, int $days)
    {
        return Order::query()
            ->where('seller_id', $seller->id)
            ->whereIn('status', ['delivered', 'refunded'])
            ->where('completed_at', '>', now()->subDays($days))
            ->get();
    }

    private function revenueReport(Seller $seller, int $days): array
    {
        $current = $this->revenueBetween($seller, now()->subDays($days), now());
        $previous = $this->revenueBetween($seller, now()->subDays($days * 2), now()->subDays($days));

        $variation = $previous > 0
            ? round(($current - $previous) / $previous * 100, 1)
            : ($current > 0 ? 100.0 : 0.0);

        return [
            'amount_minor' => (int) $current,
            'variation_pct' => $variation,
            'orders_count' => Order::query()
                ->where('seller_id', $seller->id)
                ->whereIn('status', ['delivered', 'refunded'])
                ->where('completed_at', '>', now()->subDays($days))
                ->count(),
        ];
    }

    private function revenueBetween(Seller $seller, $from, $to): int
    {
        return (int) Order::query()
            ->where('seller_id', $seller->id)
            ->whereIn('status', ['delivered', 'refunded'])
            ->whereBetween('completed_at', [$from, $to])
            ->sum('total_minor');
    }

    private function salesPerDay(Seller $seller, int $days): array
    {
        $rows = Order::query()
            ->where('seller_id', $seller->id)
            ->whereIn('status', ['delivered', 'refunded'])
            ->where('completed_at', '>', now()->subDays($days))
            ->get(['completed_at', 'total_minor'])
            ->groupBy(fn ($o) => $o->completed_at->toDateString());

        $series = [];

        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $day = $rows->get($date, collect());

            $series[] = [
                'date' => $date,
                'count' => $day->count(),
                'revenue_minor' => (int) $day->sum('total_minor'),
            ];
        }

        return $series;
    }

    private function topProducts(Seller $seller, int $days): array
    {
        $items = $seller->orders()
            ->whereIn('status', ['delivered', 'refunded'])
            ->where('completed_at', '>', now()->subDays($days))
            ->with('items')
            ->get()
            ->flatMap(fn ($o) => $o->items);

        return $items
            ->groupBy(fn ($item) => $item->product_id)
            ->map(function ($group) {
                $first = $group->first();
                $snapshot = $first->product_snapshot ?? [];

                return [
                    'product_id' => $first->product_id,
                    'name' => $snapshot['name'] ?? ('Produit #'.$first->product_id),
                    'image' => $snapshot['image'] ?? null,
                    'quantity' => (int) $group->sum('quantity'),
                    'revenue_minor' => (int) $group->sum('total_minor'),
                ];
            })
            ->sortByDesc('revenue_minor')
            ->take(5)
            ->values()
            ->all();
    }

    private function repeatCustomers(Seller $seller, int $days, $completed): array
    {
        $counts = $completed->groupBy('user_id')->map->count();

        $customers = $counts->count();
        $repeat = $counts->filter(fn ($n) => $n >= 2)->count();

        return [
            'customers_count' => (int) $customers,
            'repeat_count' => (int) $repeat,
            'rate_pct' => $customers > 0 ? (int) round($repeat / $customers * 100) : 0,
        ];
    }
}