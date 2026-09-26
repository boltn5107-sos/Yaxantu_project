"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Package, Loader2, Check, X, Truck, Coins } from "lucide-react";
import {
  getSellerOrders,
  sellerAcceptOrder,
  sellerRefuseOrder,
  sellerShipOrder,
  sellerMarkDelivered,
  type SellerOrdersEnvelope,
  type SellerSegment,
  type SellerOrderSummary,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import SellerOnboardingGate from "@/components/SellerOnboardingGate";

const segmentLabelKeys: Record<SellerSegment, string> = {
  new: "orders.segmentNew",
  ongoing: "orders.segmentOngoing",
  completed: "orders.segmentCompleted",
  disputes: "orders.segmentDisputes",
};

const segments: SellerSegment[] = ["new", "ongoing", "completed", "disputes"];

export default function SellerOrdersPage() {
  const t = useTranslations("seller");
  const [segment, setSegment] = useState<SellerSegment>("new");
  const [state, setState] = useState<SellerOrdersEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (seg: SellerSegment) => {
    setLoading(true);
    setError(null);
    try {
      setState(await getSellerOrders(seg));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orders.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load(segment);
  }, [segment, load]);

  const act = async (orderNumber: string, action: () => Promise<unknown>) => {
    setBusy(orderNumber);
    setError(null);
    try {
      await action();
      await load(segment);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orders.actionError"));
    } finally {
      setBusy(null);
    }
  };

  const renderActions = (order: SellerOrderSummary) => {
    const disabled = busy === order.order_number;
    if (order.status === "payment_pending" || order.status === "paid") {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              void act(order.order_number, () => sellerAcceptOrder(order.order_number))
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {disabled && busy === order.order_number ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {t("orders.accept")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              void act(order.order_number, () =>
                sellerRefuseOrder(order.order_number, t("orders.refusalReason")),
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" />
            {t("orders.refuse")}
          </button>
        </div>
      );
    }
    if (order.status === "preparation") {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            void act(order.order_number, () => sellerShipOrder(order.order_number))
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {disabled && busy === order.order_number ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Truck className="h-3.5 w-3.5" />
          )}
          {t("orders.ship")}
        </button>
      );
    }
    if (order.status === "shipped" || order.status === "in_delivery") {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            void act(order.order_number, () => sellerMarkDelivered(order.order_number))
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {disabled && busy === order.order_number ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Coins className="h-3.5 w-3.5" />
          )}
          {t("orders.deliver")}
        </button>
      );
    }
    return null;
  };

  return (
    <SellerOnboardingGate>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("orders.title")}</h1>
          <p className="text-sm text-gray-600">{t("orders.subtitle")}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {segments.map((seg) => {
          const count = seg === segment ? state?.meta?.total : undefined;
          const active = seg === segment;
          return (
            <button
              key={seg}
              type="button"
              onClick={() => setSegment(seg)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t(segmentLabelKeys[seg])}
              {count !== undefined && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 text-xs ${
                    active ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !state || state.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
          {t("orders.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {state.data.map((order) => (
            <OrderRow key={order.order_number} order={order} actions={renderActions(order)} />
          ))}
        </div>
      )}
      </div>
    </SellerOnboardingGate>
  );
}

function OrderRow({
  order,
  actions,
}: {
  order: SellerOrderSummary;
  actions: React.ReactNode;
}) {
  const t = useTranslations("seller");
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/seller/orders/${order.order_number}`}
              className="text-sm font-bold text-emerald-700 hover:underline"
            >
              {order.order_number}
            </Link>
            <StatusPill status={order.status} label={order.status_label} color={order.status_color} />
            {order.disputed && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                {t("orders.disputeBadge")}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {order.items.map((i) => `${i.name} ×${i.quantity}`).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {order.buyer.name ?? t("orders.clientFallback")} · {order.buyer.phone ?? "—"} ·{" "}
            {new Date(order.placed_at ?? new Date()).toLocaleString("fr-FR")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</p>
            <p className="text-xs text-gray-500">
              {t("orders.commission")} {formatPrice(order.commission)}
            </p>
          </div>
          {actions}
          <Link
            href={`/seller/orders/${order.order_number}`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {t("orders.details")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, label, color }: { status: string; label: string; color: string }) {
  const t = useTranslations("seller");
  const styles: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  const displayLabel = label || t("orders.deliveryStatus", { status });
  if (color === "orange") {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
        {displayLabel}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
        styles[color] ?? styles.orange
      }`}
    >
      {displayLabel}
    </span>
  );
}