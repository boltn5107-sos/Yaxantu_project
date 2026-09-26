"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Users,
  ShoppingBag,
  Store,
  Bike,
  Package,
  BadgePercent,
  Gift,
  TrendingUp,
  Landmark,
  Loader2,
} from "lucide-react";
import { getAdminStats, type AdminStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

const EMPTY: AdminStats = {
  users: { total: 0, active: 0, suspended: 0, banned: 0 },
  orders: { total: 0, active: 0, delivered: 0, cancelled: 0, revenue: 0, revenue_today: 0 },
  sellers: { total: 0, pending: 0, active: 0 },
  couriers: { total: 0, pending: 0, approved: 0 },
  products: { total: 0, active: 0, featured: 0 },
  marketing: { promo_codes: 0, active_promo_codes: 0, referrals: 0, rewarded_referrals: 0 },
  top_products: [],
  recent_orders: [],
};

const orderStatusLabelKeys: Record<string, string> = {
  created: "orders.statusLabels.created",
  payment_pending: "orders.statusLabels.paymentPending",
  paid: "orders.statusLabels.paid",
  preparation: "orders.statusLabels.preparation",
  shipped: "orders.statusLabels.shipped",
  in_delivery: "orders.statusLabels.inDelivery",
  delivered: "orders.statusLabels.delivered",
  cancelled: "orders.statusLabels.cancelled",
  returned: "orders.statusLabels.returned",
  refunded: "orders.statusLabels.refunded",
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setStats(await getAdminStats());
      } catch (err) {
        setError(err instanceof Error ? err.message : t("overview.loadStatsError"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("overview.title")}</h1>
        <p className="text-sm text-gray-600">
          {t("overview.greeting", { name: user?.name?.split(" ")[0] ?? "" })}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label={t("overview.accounts")} value={stats.users.total} accent="bg-emerald-50 text-emerald-700" />
        <StatCard icon={ShoppingBag} label={t("overview.orders")} value={stats.orders.total} accent="bg-emerald-50 text-emerald-700" />
        <StatCard
          icon={Store}
          label={t("overview.shops")}
          value={stats.sellers.total}
          hint={t("overview.shopsToVerify", { count: stats.sellers.pending })}
          accent="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={Bike}
          label={t("overview.couriers")}
          value={stats.couriers.total}
          hint={t("overview.couriersPending", { count: stats.couriers.pending })}
          accent="bg-purple-50 text-purple-700"
        />
        <StatCard icon={Package} label={t("overview.products")} value={stats.products.total} accent="bg-rose-50 text-rose-700" />
        <StatCard
          icon={BadgePercent}
          label={t("overview.promoCodes")}
          value={stats.marketing.promo_codes}
          hint={t("overview.referrals", { count: stats.marketing.referrals })}
          accent="bg-cyan-50 text-cyan-700"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            {t("overview.revenue")}
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(stats.orders.revenue)}</p>
          <p className="mt-1 text-xs text-gray-400">
            {t("overview.today", { amount: formatPrice(stats.orders.revenue_today) })}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Landmark className="h-4 w-4 text-emerald-600" />
            {t("overview.activeOrders")}
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.orders.active}</p>
          <p className="mt-1 text-xs text-gray-400">
            {t("overview.deliveredAndCancelled", {
              delivered: stats.orders.delivered,
              cancelled: stats.orders.cancelled,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Gift className="h-4 w-4 text-pink-600" />
            {t("overview.rewardedReferrals")}
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.marketing.rewarded_referrals}</p>
          <p className="mt-1 text-xs text-gray-400">
            {t("overview.activePromoCodes", { count: stats.marketing.active_promo_codes })}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4 text-gray-600" />
            {t("overview.activeAccounts")}
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.users.active}</p>
          <p className="mt-1 text-xs text-gray-400">
            {t("overview.suspendedAndBanned", {
              suspended: stats.users.suspended,
              banned: stats.users.banned,
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">{t("overview.latestOrders")}</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              {t("overview.viewAll")}
            </Link>
          </div>
          {stats.recent_orders.length === 0 ? (
            <p className="text-sm text-gray-500">{t("overview.noRecentOrders")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.recent_orders.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.order_number}`} className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{order.order_number}</p>
                    <p className="truncate text-xs text-gray-500">{order.customer ?? "—"} · {order.shop ?? "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</p>
                    <p className="text-xs capitalize text-gray-500">
                      {orderStatusLabelKeys[order.status]
                        ? t(orderStatusLabelKeys[order.status])
                        : order.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{t("overview.topProducts")}</h2>
          {stats.top_products.length === 0 ? (
            <p className="text-sm text-gray-500">{t("overview.noSales")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.top_products.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-3">
                  <p className="min-w-0 truncate text-sm font-medium text-gray-900">{product.name}</p>
                  <span className="shrink-0 text-xs font-semibold text-gray-500">
                    {t("overview.soldCount", { count: product.sold })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}