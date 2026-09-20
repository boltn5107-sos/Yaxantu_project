"use client";

import Link from "next/link";
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
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setStats(await getAdminStats());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger les statistiques.");
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
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-600">
          Pilotage global de la place Yaxantu — bonjour {user?.name?.split(" ")[0]}.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Comptes" value={stats.users.total} accent="bg-blue-50 text-blue-700" />
        <StatCard icon={ShoppingBag} label="Commandes" value={stats.orders.total} accent="bg-emerald-50 text-emerald-700" />
        <StatCard icon={Store} label="Boutiques" value={stats.sellers.total} hint={`${stats.sellers.pending} à vérifier`} accent="bg-amber-50 text-amber-700" />
        <StatCard icon={Bike} label="Livreurs" value={stats.couriers.total} hint={`${stats.couriers.pending} en attente`} accent="bg-purple-50 text-purple-700" />
        <StatCard icon={Package} label="Produits" value={stats.products.total} accent="bg-rose-50 text-rose-700" />
        <StatCard icon={BadgePercent} label="Codes promo" value={stats.marketing.promo_codes} hint={`${stats.marketing.referrals} parrainages`} accent="bg-cyan-50 text-cyan-700" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Chiffre d&apos;affaires
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatPrice(stats.orders.revenue)}</p>
          <p className="mt-1 text-xs text-gray-400">Aujourd&apos;hui : {formatPrice(stats.orders.revenue_today)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Landmark className="h-4 w-4 text-blue-600" />
            Commandes actives
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.orders.active}</p>
          <p className="mt-1 text-xs text-gray-400">{stats.orders.delivered} livrées · {stats.orders.cancelled} annulées</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Gift className="h-4 w-4 text-pink-600" />
            Parrainages récompensés
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.marketing.rewarded_referrals}</p>
          <p className="mt-1 text-xs text-gray-400">{stats.marketing.active_promo_codes} codes actifs</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4 text-gray-600" />
            Comptes actifs
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.users.active}</p>
          <p className="mt-1 text-xs text-gray-400">
            {stats.users.suspended} suspendus · {stats.users.banned} bannis
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Dernières commandes</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-blue-700 hover:text-blue-800">
              Tout voir
            </Link>
          </div>
          {stats.recent_orders.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune commande pour le moment.</p>
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
                    <p className="text-xs capitalize text-gray-500">{order.status.replace("_", " ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Produits les plus vendus</h2>
          {stats.top_products.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune vente enregistrée.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.top_products.map((product) => (
                <div key={product.id} className="flex items-center justify-between py-3">
                  <p className="min-w-0 truncate text-sm font-medium text-gray-900">{product.name}</p>
                  <span className="shrink-0 text-xs font-semibold text-gray-500">{product.sold} vendus</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}