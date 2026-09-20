"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, MapPin, User as UserIcon } from "lucide-react";
import {
  getAdminOrder,
  updateAdminOrderStatus,
  cancelAdminOrder,
  type Order,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";

const statusOptions = [
  { value: "created", label: "Créée" },
  { value: "payment_pending", label: "Paiement en attente" },
  { value: "paid", label: "Payée" },
  { value: "preparation", label: "En préparation" },
  { value: "shipped", label: "Expédiée" },
  { value: "in_delivery", label: "En livraison" },
  { value: "delivered", label: "Livrée" },
  { value: "cancelled", label: "Annulée" },
  { value: "returned", label: "Retournée" },
  { value: "refunded", label: "Remboursée" },
];

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<(Order & { customer?: string | null; customer_email?: string | null; customer_phone?: string | null; shop?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getAdminOrder(params.orderNumber)
      .then((result) => {
        if (cancelled) return;
        setOrder(result);
        setSelectedStatus(result.status);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Commande introuvable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.orderNumber, reload]);

  const saveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setBusy("status");
    setError(null);
    setNotice(null);
    try {
      const message = await updateAdminOrderStatus(order.id, selectedStatus);
      setNotice(message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    const reason = window.prompt("Motif de l'annulation (obligatoire) :");
    if (!reason) return;
    setBusy("cancel");
    setError(null);
    setNotice(null);
    try {
      const message = await cancelAdminOrder(order.id, reason);
      setNotice(message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annulation impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800">
            <ArrowLeft className="h-4 w-4" />
            Commandes
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-600">
            Commande du {order.placed_at ? new Date(order.placed_at).toLocaleString("fr-FR") : "—"} · Statut :{" "}
            <span className="font-semibold capitalize">{order.status_label}</span>
          </p>
        </div>
        {order.status !== "cancelled" && (
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={busy === "cancel"}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />}
            Annuler la commande
          </button>
        )}
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={saveStatus} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Changer de statut</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy === "status" || selectedStatus === order.status}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Mettre à jour
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Articles ({order.items_count})</h2>
          <div className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900">{formatPrice(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between font-medium text-emerald-700">
                <span>Remise {order.promo_code ? `(${order.promo_code})` : ""}</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Livraison</span>
              <span>{order.shipping === 0 ? "Gratuite" : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <UserIcon className="h-4 w-4 text-gray-500" /> Client
            </h2>
            <p className="text-sm font-medium text-gray-900">{order.customer ?? "—"}</p>
            <p className="text-sm text-gray-500">{order.customer_email ?? "—"}</p>
            <p className="text-sm text-gray-500">{order.customer_phone ?? "—"}</p>
            <p className="mt-2 text-sm text-gray-600">Boutique : <span className="font-medium">{order.shop ?? "—"}</span></p>
          </div>

          {order.address && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
                <MapPin className="h-4 w-4 text-gray-500" /> Adresse de livraison
              </h2>
              <p className="text-sm text-gray-700">
                {order.address.address_line1} {order.address.address_line2}
              </p>
              <p className="text-sm text-gray-700">
                {order.address.city} {order.address.state_province ? `(${order.address.state_province})` : ""}
              </p>
              <p className="text-sm text-gray-500">{order.address.phone ?? "—"}</p>
            </div>
          )}

          {order.delivery && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Livraison</h2>
              <p className="text-sm capitalize text-gray-700">
                Statut : {order.delivery.status.replace("_", " ")}
              </p>
              <p className="text-sm text-gray-600">Transporteur : {order.delivery.provider ?? "Interne"}</p>
              {order.delivery.tracking_number && (
                <p className="text-sm text-gray-600">Suivi : {order.delivery.tracking_number}</p>
              )}
            </div>
          )}

          {order.payment && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Paiement</h2>
              <p className="text-sm capitalize text-gray-700">
                Statut : {order.payment.status.replace("_", " ")}
              </p>
              <p className="text-sm text-gray-600">Méthode : {order.payment.method ?? "—"}</p>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/admin/orders")}
        className="text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        ← Retour à la liste
      </button>
    </div>
  );
}