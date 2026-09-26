"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Package,
  Plus,
  Store,
  Loader2,
  Trash2,
  EyeOff,
  Eye,
  Pencil,
  Rocket,
  Wrench,
} from "lucide-react";
import {
  getSellerProducts,
  updateSellerProduct,
  deleteSellerProduct,
  mediaUrl,
  type SellerProduct,
  type ApiError,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

const productStatusKeys = {
  active: "products.list.status.active",
  paused: "products.list.status.paused",
} as const;

export default function SellerProductsPage() {
  const t = useTranslations("seller");
  const { user } = useAuth();
  const { data, loading, error, errorStatus } = useApi(
    () => getSellerProducts(),
    [],
    [] as SellerProduct[],
  );
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [toggled, setToggled] = useState<string | null>(null);

  const onboarded = user?.seller?.is_onboarded === true;

  if (user && user.seller && !onboarded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <Store className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          {t("products.gate.shopNotCreatedTitle")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("products.gate.shopNotCreatedDescription")}
        </p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Rocket className="h-4 w-4" />
          {t("products.gate.createShop")}
        </Link>
      </div>
    );
  }

  if (!user?.seller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Wrench className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {t("products.gate.sellerProfileTitle")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("products.gate.sellerProfileDescription")}
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t("products.gate.chooseProfile")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && errorStatus === 403) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {t("products.gate.shopRequiredTitle")}
        </h1>
        <p className="mt-2 text-gray-600">{error}</p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Rocket className="h-4 w-4" />
          {t("products.gate.createShop")}
        </Link>
      </div>
    );
  }

  const toggle = async (product: SellerProduct, active: boolean) => {
    if (busySlug) return;
    setBusySlug(product.slug);
    setToggled(null);
    try {
      await updateSellerProduct(product.slug, { is_active: active });
      data.find((p) => p.slug === product.slug)!.is_active = active;
      setToggled(product.slug);
      setTimeout(() => setToggled(null), 1500);
    } catch (err) {
      alert((err as ApiError).message ?? t("products.errors.update"));
    } finally {
      setBusySlug(null);
    }
  };

  const remove = async (product: SellerProduct) => {
    if (!window.confirm(t("products.list.deleteConfirm", { name: product.name })))
      return;
    setBusySlug(product.slug);
    try {
      await deleteSellerProduct(product.slug);
      data.splice(
        data.findIndex((p) => p.slug === product.slug),
        1,
      );
    } catch (err) {
      alert((err as ApiError).message ?? t("products.errors.delete"));
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("products.list.title")}
            </h1>
            <p className="text-gray-600">{t("products.list.subtitle")}</p>
          </div>
        </div>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("products.list.add")}
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            {t("products.list.emptyTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t("products.list.emptyDescription")}
          </p>
          <Link
            href="/seller/products/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            {t("products.list.add")}
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-100">
            {data.map((product) => (
              <div
                key={product.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5"
              >
                {product.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(product.thumbnail) ?? ""}
                    alt={product.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <Package className="h-7 w-7 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-gray-900">
                      {product.name}
                    </p>
                    {product.is_active ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {t(productStatusKeys.active)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        {t(productStatusKeys.paused)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {t("products.list.stock", {
                      price: formatPrice(product.price),
                      stock: product.stock_quantity,
                    })}
                    {product.category ? ` • ${product.category.name}` : ""}
                    {t("products.list.shipping")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/seller/products/${product.slug}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                    {t("products.list.edit")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(product, !product.is_active)}
                    disabled={busySlug === product.slug}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {toggled === product.slug ? (
                      <span className="text-emerald-600">{t("products.list.updated")}</span>
                    ) : product.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        {t("products.list.pause")}
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        {t("products.list.reactivate")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(product)}
                    disabled={busySlug === product.slug}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("products.list.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}