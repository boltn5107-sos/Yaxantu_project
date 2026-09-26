"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/utils";

export type SummaryItem = {
  id: number | string;
  quantity: number;
  name: string | null | undefined;
  total: number;
};

export type SummarySeller = {
  seller_id: number;
  shop_name: string;
  distance_km: number | null;
  shipping: number;
};

export type OrderSummaryProps = {
  items: SummaryItem[];
  subtotal: number;
  /** Montant de livraison connu (≥ 0), ou null tant qu'il n'est pas calculé. */
  shipping: number | null;
  sellers?: SummarySeller[];
  estimating?: boolean;
  /** Info complémentaire sous la ligne Livraison (ex. calcul selon distance). */
  note?: string;
  footer?: ReactNode;
};

/**
 * Récapitulatif partagé panier ↔ checkout : mêmes articles, mêmes règles de
 * calcul du total. Les frais de livraison sont toujours inclus dans le total
 * lorsqu'ils sont connus ; au checkout, une case « J'accepte les frais » est
 * présentée tant qu'un montant est facturé (montré = facturé).
 */
export function OrderSummary({
  items,
  subtotal,
  shipping,
  sellers = [],
  estimating = false,
  note,
  footer,
}: OrderSummaryProps) {
  const t = useTranslations("cart");
  const shippingCharged =
    shipping !== null && shipping > 0 ? shipping : 0;
  const total = Math.max(0, subtotal) + shippingCharged;

  const formatKm = (km: number) => `${km.toFixed(1).replace(".", ",")} km`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t("recap")}
      </h3>

      <div className="space-y-2 text-sm">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 text-gray-700"
          >
            <span className="flex-1 line-clamp-2">
              {item.quantity} × {item.name ?? t("item")}
            </span>
            <span className="font-medium whitespace-nowrap">
              {formatPrice(item.total)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 text-sm">
        <div className="flex items-center justify-between text-gray-700">
          <span>{t("subtotal")}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between text-gray-700">
          <span>{t("shipping")}</span>
          {shipping === null ? (
            <span className="text-gray-400">{t("shippingToCompute")}</span>
          ) : shipping === 0 ? (
            <span className="text-emerald-700 font-medium">{t("free")}</span>
          ) : (
            <span>{formatPrice(shipping)}</span>
          )}
        </div>

        {note && (
          <p className="text-xs text-gray-500 leading-relaxed">{note}</p>
        )}

        {sellers.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <div className="space-y-1.5">
              {sellers.map((s) => (
                <div
                  key={s.seller_id}
                  className="flex items-center justify-between gap-3 text-xs text-gray-600"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    {s.distance_km != null && (
                      <span className="whitespace-nowrap text-gray-400">
                        {formatKm(s.distance_km)}
                      </span>
                    )}
                    <span className="truncate">{s.shop_name}</span>
                  </span>
                  <span
                    className={`whitespace-nowrap font-medium ${s.shipping === 0 ? "text-emerald-700" : ""}`}
                  >
                    {s.shipping === 0 ? t("free") : formatPrice(s.shipping)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {estimating && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("estimating")}
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base font-semibold text-gray-900">
          <span>{t("total")}</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {footer}
    </div>
  );
}