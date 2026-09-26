"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  CreditCard,
  ChevronRight,
  Copy,
  XCircle,
  Loader2,
} from "lucide-react";
import { getOrder, cancelOrder, mediaUrl, type Order } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice, fallbackImage } from "@/lib/utils";

const PROGRESS_STEPS = [
  { labelKey: "stepConfirmed", icon: CheckCircle2 },
  { labelKey: "stepPaid", icon: CreditCard },
  { labelKey: "stepShipped", icon: Truck },
  { labelKey: "stepDelivered", icon: CheckCircle2 },
];

function progressIndex(order: Order): number {
  switch (order.status) {
    case "delivered":
      return 4;
    case "in_delivery":
    case "shipped":
      return 3;
    case "paid":
    case "preparation":
      return 2;
    case "payment_pending":
    case "created":
      return 1;
    default:
      return 0;
  }
}

function cancellable(order: Order): boolean {
  return ["created", "payment_pending", "paid", "preparation"].includes(
    order.status,
  );
}

function OrderDetailContent({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("orderDetail");
  const terr = useTranslations("errors");
  const { user, loading: authLoading } = useAuth();
  const { data: order, errorStatus, loading } = useApi<Order | null>(
    async () => (user ? getOrder(orderNumber) : Promise.resolve(null)),
    [user?.id, orderNumber],
    null,
  );

  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const created = searchParams.get("created") === "1";

  useEffect(() => {
    if (errorStatus === 401 && !authLoading && !user) {
      router.push("/auth/login?next=/orders/" + orderNumber);
    }
  }, [errorStatus, user, authLoading, router, orderNumber]);

  if (loading || authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-gray-500">
        {t("loading")}
      </div>
    );
  }

  if (!order) {
    if (errorStatus !== null) {
      return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-16 text-center">
            <p className="text-lg font-medium text-gray-900">
              {errorStatus === 404
                ? t("notFound")
                : t("loadError")}
            </p>
            <Link
              href="/orders"
              className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
            >
              {t("backToOrders")}
            </Link>
          </div>
        </div>
      );
    }
    return null;
  }

  const steps = PROGRESS_STEPS.map((step, idx) => ({
    ...step,
    label: t(step.labelKey),
    done: idx < progressIndex(order),
  }));

  const isTerminal =
    order.status === "cancelled" ||
    order.status === "returned" ||
    order.status === "refunded";

  const handleCancel = async () => {
    if (!window.confirm(t("cancelConfirm"))) return;
    setCancelling(true);
    setActionError(null);
    try {
      const updated = await cancelOrder(orderNumber);
      Object.assign(order, updated);
      setCancelling(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : terr("network"));
      setCancelling(false);
    }
  };

  const copyTracking = () => {
    if (!order.tracking_number) return;
    void navigator.clipboard.writeText(order.tracking_number).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/orders" className="hover:text-emerald-700 transition-colors">
            {t("breadcrumb")}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">{order.order_number}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("title", { orderNumber })}
          </h1>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            {order.status_label}
          </span>
        </div>
        <p className="mt-1 text-gray-600">
          {order.placed_at
            ? new Date(order.placed_at).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "—"}
        </p>
        {created && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {t("created")}
          </div>
        )}
        {actionError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("statusTitle")}
            </h2>
            {isTerminal ? (
              <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <XCircle className="h-6 w-6" />
                <p>
                  {order.status === "cancelled"
                    ? t("cancelled")
                    : order.status_label}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          step.done
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            step.done ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                      {idx < steps.length - 1 && (
                        <div className="hidden sm:block h-px w-8 bg-gray-200 mx-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("itemsTitle")}</h2>
            <div className="space-y-4">
              {order.items.length === 0 ? (
                <p className="text-sm text-gray-600">{t("noItems")}</p>
              ) : (
                order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-xl border border-gray-100 p-4"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(item.image) ?? fallbackImage(120, 120, 2)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.slug ? (
                        <Link href={`/product/${item.slug}`} className="hover:text-emerald-700 transition-colors">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      )}
                      <p className="text-xs text-gray-600">
                        {t("quantity", { quantity: item.quantity })}
                        {item.seller ? t("seller", { seller: item.seller }) : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatPrice(item.total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {cancellable(order) && (
            <div className="flex justify-end">
              <button
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("cancel")}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t("summary")}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-gray-700">
                <span>{t("subtotal")}</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <span>{t("shipping")}</span>
                <span
                  className={
                    order.shipping === 0 ? "text-emerald-700 font-medium" : ""
                  }
                >
                  {order.shipping === 0 ? t("free") : formatPrice(order.shipping)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base font-semibold text-gray-900">
                <span>{t("total")}</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t("information")}
            </h3>
            <div className="space-y-3 text-sm">
              {order.address && (
                <div className="flex items-start gap-3 text-gray-700">
                  <MapPin className="mt-0.5 h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{order.address.label}</span>
                </div>
              )}
              {order.payment && (
                <div className="flex items-start gap-3 text-gray-700">
                  <CreditCard className="mt-0.5 h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p>{order.payment.method_label}</p>
                    <p className="text-xs text-gray-500">
                      {order.payment.status_label}
                    </p>
                    {order.payment.transaction_id && (
                      <p className="text-xs text-gray-500">
                        {t("ref", { id: order.payment.transaction_id })}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {order.tracking_number && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{order.tracking_number}</span>
                  <button
                    onClick={copyTracking}
                    className="text-emerald-700 hover:text-emerald-800 transition-colors"
                    aria-label={t("copyTrackingLabel")}
                    title={t("copyTitle")}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = use(params);
  return (
    <Suspense fallback={null}>
      <OrderDetailContent orderNumber={orderNumber} />
    </Suspense>
  );
}