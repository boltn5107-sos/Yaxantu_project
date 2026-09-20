"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Store,
  Loader2,
  Trash2,
  EyeOff,
  Eye,
  Rocket,
  Wrench,
} from "lucide-react";
import {
  getSellerProducts,
  updateSellerProduct,
  deleteSellerProduct,
  type SellerProduct,
  type ApiError,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

export default function SellerProductsPage() {
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
          Votre boutique n&apos;est pas encore créée
        </h1>
        <p className="mt-2 text-gray-600">
          Les produits sont reliés à une boutique (commandes, confiance,
          paiements). Terminez vos 5 étapes pour débloquer l&apos;ajout de
          produits.
        </p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Rocket className="h-4 w-4" />
          Créer ma boutique
        </Link>
      </div>
    );
  }

  if (!user?.seller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Wrench className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          Profil Vendeur requis
        </h1>
        <p className="mt-2 text-gray-600">
          Activez le profil Vendeur pour gérer vos produits.
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Choisir mon profil
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && errorStatus === 403) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Boutique requise</h1>
        <p className="mt-2 text-gray-600">{error}</p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Rocket className="h-4 w-4" />
          Créer ma boutique
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
      alert((err as ApiError).message ?? "Erreur pendant la mise à jour.");
    } finally {
      setBusySlug(null);
    }
  };

  const remove = async (product: SellerProduct) => {
    if (!window.confirm(`Supprimer « ${product.name} » ?`)) return;
    setBusySlug(product.slug);
    try {
      await deleteSellerProduct(product.slug);
      data.splice(
        data.findIndex((p) => p.slug === product.slug),
        1,
      );
    } catch (err) {
      alert((err as ApiError).message ?? "Erreur pendant la suppression.");
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes produits</h1>
            <p className="text-gray-600">
              Ils apparaissent sur votre boutique publique.
            </p>
          </div>
        </div>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter un produit
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Aucun produit pour le moment
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Ajoutez votre premier produit pour remplir votre boutique.
          </p>
          <Link
            href="/seller/products/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Ajouter un produit
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
                    src={product.thumbnail}
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
                        Actif
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        En pause
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {formatPrice(product.price)} • Stock : {product.stock_quantity}
                    {product.category ? ` • ${product.category.name}` : ""}
                    {product.requires_shipping
                      ? product.shipping_rate > 0
                        ? ` • Livraison ${formatPrice(product.shipping_rate)}`
                        : " • Livraison incluse"
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(product, !product.is_active)}
                    disabled={busySlug === product.slug}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {toggled === product.slug ? (
                      <span className="text-emerald-600">Mis à jour</span>
                    ) : product.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Mettre en pause
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Réactiver
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
                    Supprimer
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