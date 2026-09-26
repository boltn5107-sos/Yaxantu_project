"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Search, ShoppingBag, Loader2 } from "lucide-react";
import { getAdminOrders, type AdminOrder } from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";
import { formatPrice } from "@/lib/utils";

const statusFilter = [
  { value: "", labelKey: "orders.filters.allStatuses" },
  { value: "created", labelKey: "orders.statusLabels.created" },
  { value: "payment_pending", labelKey: "orders.statusLabels.paymentPending" },
  { value: "paid", labelKey: "orders.statusLabels.paid" },
  { value: "preparation", labelKey: "orders.statusLabels.preparation" },
  { value: "shipped", labelKey: "orders.statusLabels.shipped" },
  { value: "in_delivery", labelKey: "orders.statusLabels.inDelivery" },
  { value: "delivered", labelKey: "orders.statusLabels.delivered" },
  { value: "cancelled", labelKey: "orders.statusLabels.cancelled" },
  { value: "returned", labelKey: "orders.statusLabels.returned" },
  { value: "refunded", labelKey: "orders.statusLabels.refunded" },
] as const;

export default function AdminOrdersPage() {
  const t = useTranslations("admin");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [status, setStatus] = useState("");
  const [inputSearch, setInputSearch] = useState("");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminOrders({ status: status || undefined, search: search || undefined, page })
      .then((result) => {
        if (cancelled) return;
        setOrders(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("orders.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, search, page, reload]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputSearch);
    setPage(1);
    setReload((n) => n + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("orders.title")}</h1>
        <p className="text-sm text-gray-600">{t("orders.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            {t("orders.search")}
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          {statusFilter.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {t("orders.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("orders.table.order")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.table.client")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.table.shop")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.table.status")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("orders.table.total")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.table.date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.order_number}`} className="font-semibold text-emerald-700 hover:underline">
                      {order.order_number}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {t("orders.itemCount", { count: order.items_count })}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{order.customer ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{order.shop ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                      {order.status_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPrice(order.total)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.placed_at ? new Date(order.placed_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-4 py-3">
            <AdminPagination meta={meta} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}