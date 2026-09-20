"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Loader2,
  Trophy,
  Users,
  ShieldCheck,
} from "lucide-react";
import { getSellerAnalytics, type SellerAnalytics } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import SellerOnboardingGate from "@/components/SellerOnboardingGate";

export default function SellerAnalyticsPage() {
  const [periods] = useState(["7d", "30d", "90d"]);
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<SellerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getSellerAnalytics(period)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les analyses."))
      .finally(() => setLoading(false));
  }, [period]);

  const maxDay = Math.max(
    1,
    ...(data?.sales_per_day.map((d) => d.amount_minor) ?? [1]),
  );

  return (
    <SellerOnboardingGate>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes analyses</h1>
            <p className="text-sm text-gray-600">Comment votre boutique se porte.</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                period === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p === "7d" ? "7 jours" : p === "30d" ? "30 jours" : "90 jours"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error || !data ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-gray-600">
          {error ?? "Aucune donnée."}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-gray-600">Chiffre d&apos;affaires sur la période</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {formatPrice(data.revenue.amount_minor)}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  data.revenue.variation_pct >= 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {data.revenue.variation_pct >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {data.revenue.variation_pct >= 0 ? "+" : ""}
                {Math.round(data.revenue.variation_pct)} %
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Ventes par jour</h2>
            <div className="flex h-40 items-end gap-1">
              {data.sales_per_day.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date} · ${formatPrice(day.amount_minor)} · ${day.orders} commande(s)`}
                  className="group relative flex-1"
                >
                  <div
                    className={`w-full rounded-t ${
                      day.amount_minor > 0 ? "bg-blue-500 group-hover:bg-blue-600" : "bg-gray-100"
                    }`}
                    style={{ height: `${Math.max(3, (day.amount_minor / maxDay) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">
              Chaque barre = une journée · Touchez une barre pour le détail.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
                <Trophy className="h-5 w-5 text-amber-500" />
                Mes meilleures ventes
              </h2>
              {data.top_products.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun produit vendu sur la période.</p>
              ) : (
                <ol className="space-y-3">
                  {data.top_products.map((product, index) => (
                    <li key={product.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            index === 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">
                            {product.quantity} vendu(s) · {formatPrice(product.revenue)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900">
                  <Users className="h-5 w-5 text-blue-500" />
                  Clients qui reviennent
                </h2>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.round(data.repeat_customers.rate_pct)} %
                </p>
                <p className="text-sm text-gray-600">
                  {data.repeat_customers.customers} client(s) ont commandé au moins deux fois.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-gray-900">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Niveau de confiance
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-bold text-emerald-700">{data.trust.score}</p>
                  <div className="flex-1">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, data.trust.score)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">/100</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {data.trust.explanations.map((explanation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                      {explanation}
                    </li>
                  ))}
                  {data.trust.explanations.length === 0 && (
                    <li className="text-sm text-gray-500">Aucun événement de confiance récent.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </SellerOnboardingGate>
  );
}