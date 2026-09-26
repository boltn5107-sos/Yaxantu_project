"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Package,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { getOrders, type Order } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { Suspense } from "react";

type OrderStyle = {
  bg: string;
  icon: typeof Package;
  label: string;
};

function statusStyle(status: string, label: string): OrderStyle {
  switch (status) {
    case "delivered":
      return { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle2, label };
    case "in_delivery":
    case "shipped":
      return { bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: Truck, label };
    case "preparation":
    case "paid":
    case "payment_pending":
      return { bg: "bg-amber-50 text-amber-700 border border-amber-200", icon: Clock, label };
    case "cancelled":
    case "refunded":
      return { bg: "bg-red-50 text-red-700 border border-red-200", icon: XCircle, label };
    default:
      return { bg: "bg-gray-50 text-gray-700 border border-gray-200", icon: Clock, label };
  }
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("orders");
  const tc = useTranslations("cart");
  const { user, loading: authLoading } = useAuth();

  const statusFallback = (status: string): string => {
    switch (status) {
      case "delivered":
        return t("statusDelivered");
      case "in_delivery":
      case "shipped":
        return t("statusShipped");
      case "preparation":
      case "paid":
      case "payment_pending":
        return t("statusInProgress");
      case "cancelled":
      case "refunded":
        return t("statusCancelled");
      default:
        return status;
    }
  };
  const { data: orders, errorStatus, loading } = useApi<Order[]>(
    async () => (user ? getOrders() : Promise.resolve([])),
    [user?.id],
    [],
  );

  const created = searchParams.get("created") === "1";

  useEffect(() => {
    if (errorStatus === 401 && !authLoading && !user) {
      router.push("/auth/login?next=/orders");
    }
  }, [errorStatus, user, authLoading, router]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-gray-600">{t("subtitle")}</p>
      </div>

      {created && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t("created")}
        </div>
      )}

      {loading || authLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          {t("loading")}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{t("emptyTitle")}</h2>
          <p className="mt-2 text-sm text-gray-600">{t("emptySubtitle")}</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            {tc("browseProducts")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const style = statusStyle(order.status, order.status_label || statusFallback(order.status));
            const StatusIcon = style.icon;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/orders/${order.order_number}`} className="text-sm font-semibold text-gray-900 hover:text-emerald-700 transition-colors">
                        {order.order_number}
                      </Link>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.bg}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {style.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {order.placed_at
                        ? new Date(order.placed_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
                        : "—"}{" "}
                      • {t("itemsCount", { count: order.items_count })}
                    </p>
                    {order.tracking_number && (
                      <p className="text-sm text-gray-600">
                        {t("tracking")}
                        <span className="font-medium text-gray-900">{order.tracking_number}</span>
                      </p>
                    )}
                  </div>

                  <div className="sm:text-right">
                    <p className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.payment?.method_label ?? ""}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                  <Link
                    href={`/orders/${order.order_number}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    {t("details")}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersContent />
    </Suspense>
  );
}