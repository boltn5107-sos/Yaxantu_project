"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  Truck,
  Coins,
  Loader2,
  Receipt,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import {
  getSellerOrder,
  sellerAcceptOrder,
  sellerRefuseOrder,
  sellerShipOrder,
  sellerMarkDelivered,
  mediaUrl,
  type SellerOrderDetail,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";

export default function SellerOrderDetailPage() {
  const t = useTranslations("seller");
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = params.orderNumber;

  const [order, setOrder] = useState<SellerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await getSellerOrder(orderNumber));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orders.notFound"));
    } finally {
      setLoading(false);
    }
  }, [orderNumber, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (
    name: string,
    action: () => Promise<void>,
    next?: string,
  ) => {
    setBusy(name);
    setError(null);
    try {
      await action();
      if (next) {
        router.push(next);
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orders.actionError"));
    } finally {
      setBusy(null);
    }
  };

  const segment = (searchParams.get("back") ?? "").startsWith("/")
    ? searchParams.get("back")
    : "/seller/orders";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
         <p className="text-gray-600">{error ?? t("orders.notFound")}</p>
        <Link href="/seller/orders" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
           {t("orders.backToOrders")}

        </Link>
      </div>
    );
  }

  const canAccept = order.status === "payment_pending" || order.status === "paid";
  const canShip = order.status === "preparation";
  const canDeliver = order.status === "shipped" || order.status === "in_delivery";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <Link
        href={segment ?? "/seller/orders"}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("orders.backToOrders")}
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {order.status_label}
        </span>
        {order.disputed && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            <ShieldAlert className="h-3.5 w-3.5" />
             {t("orders.disputeInProgress")}

          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {canAccept && (
        <div className="mb-6 flex gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void act("accept", () => sellerAcceptOrder(orderNumber))}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
             {t("orders.acceptOrder")}

          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void act("refuse", () => sellerRefuseOrder(orderNumber))}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
             {t("orders.refuse")}

          </button>
        </div>
      )}

      {canShip && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void act(
              "ship",
              async () => {
                await sellerShipOrder(orderNumber);
              },
              undefined,
            )
          }
          className="mb-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy === "ship" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
           {t("orders.shipWithInstructions")}

        </button>
      )}

      {canDeliver && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void act("deliver", () => sellerMarkDelivered(orderNumber, t("orders.deliveryReason")))
          }
          className="mb-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy === "deliver" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
           {t("orders.confirmReceived")}

        </button>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <Receipt className="h-5 w-5 text-gray-400" />
            {t("orders.amountsTitle")}
          </h2>
          <dl className="space-y-3 text-sm">
            <Row label={t("orders.sale")} value={formatPrice(order.detail.sale_price)} />
            <Row label={t("orders.shipping")} value={formatPrice(order.detail.shipping)} />
            <div className="border-t border-dashed border-gray-200 pt-3">
              <Row
                label={t("orders.platformCommission")}
                value={`- ${formatPrice(order.detail.platform_commission)}`}
                muted
              />
              <Row
                label={t("orders.paymentFee")}
                value={`- ${formatPrice(order.detail.payment_fee)}`}
                muted
              />
            </div>
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <dt className="font-semibold text-gray-900">{t("orders.netReceived")}</dt>
                <dd className="font-bold text-emerald-700">{formatPrice(order.detail.net_received)}</dd>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t("orders.netReceivedHint")}</p>
            </div>
          </dl>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <MapPin className="h-5 w-5 text-gray-400" />
              {t("orders.deliveryTitle")}
            </h2>
            {order.address ? (
              <div className="text-sm text-gray-700">
                {order.address.recipient && <p className="font-medium">{order.address.recipient}</p>}
                <p>
                  {order.address.address_line1}
                  {order.address.address_line2 ? `, ${order.address.address_line2}` : ""}
                </p>
                <p>{order.address.city}</p>
                {order.address.phone && <p className="mt-1 font-medium text-emerald-700">{order.address.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t("orders.noAddress")}</p>
            )}
            {order.delivery?.courier && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {t("orders.courierProposed")}
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {order.delivery.courier.name ?? t("orders.defaultCourierName")}
                </p>
                {order.delivery.courier.phone && (
                  <p className="text-sm text-emerald-700">{order.delivery.courier.phone}</p>
                )}
                {order.delivery.courier.transport && (
                  <p className="text-xs text-emerald-600">
                    {t("orders.transportLabel", { transport: order.delivery.courier.transport })}
                  </p>
                )}
                {order.delivery.tracking_number && (
                  <p className="mt-1 text-xs text-gray-600">
                    {t("orders.trackingLabel", { trackingNumber: order.delivery.tracking_number })}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {t("orders.statusLabel", { status: order.delivery.status })}
                </p>
              </div>
            )}
          </div>

          {order.dispute && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-red-700">
                <ShieldAlert className="h-5 w-5" />
                {order.dispute.title}
              </h2>
              <p className="text-sm text-red-700">
                {t("orders.disputeTrustNote", { count: order.dispute.messages_count })}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold text-gray-900">{t("orders.itemsTitle")}</h2>
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(item.image) ?? ""} alt="" className="h-12 w-12 rounded-xl border border-gray-200 object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gray-100" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">× {item.quantity}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatPrice(item.total)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-sm text-gray-600">{t("orders.orderTotal")}</span>
          <span className="text-lg font-bold text-gray-900">{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-gray-500" : "text-gray-600"}>{label}</dt>
      <dd className={muted ? "font-medium text-gray-500" : "font-semibold text-gray-900"}>{value}</dd>
    </div>
  );
}