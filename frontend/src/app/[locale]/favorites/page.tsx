"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Heart,
  ShoppingCart,
  Star,
  ArrowRight,
  BadgeCheck,
  Check,
  Loader2,
} from "lucide-react";
import { getFavorites, removeFavorite, addToCart, mediaUrl, type Product } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice, fallbackImage } from "@/lib/utils";

export default function FavoritesPage() {
  const t = useTranslations("favorites");
  const tp = useTranslations("product");
  const tc = useTranslations("cart");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: remote, errorStatus, loading } = useApi<Product[]>(
    async () => (user ? getFavorites() : Promise.resolve([])),
    [user?.id],
    [],
  );

  const [favorites, setFavorites] = useState<Product[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);

  useEffect(() => {
    if (!remote) return;
    const h = window.setTimeout(() => setFavorites(remote), 0);
    return () => window.clearTimeout(h);
  }, [remote]);

  useEffect(() => {
    if (errorStatus === 401 && !authLoading && !user) {
      router.push("/auth/login?next=/favorites");
    }
  }, [errorStatus, user, authLoading, router]);

  const remove = async (productId: number) => {
    setBusyId(productId);
    try {
      await removeFavorite(productId);
      setFavorites((prev) => prev.filter((p) => p.id !== productId));
    } catch {
      // silencieux : on laisse l'utilisateur réessayer
    } finally {
      setBusyId(null);
    }
  };

  const add = async (productId: number) => {
    setBusyId(productId);
    try {
      await addToCart(productId, 1);
      setAddedId(productId);
      setTimeout(() => setAddedId(null), 1500);
    } catch {
      // silencieux
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-gray-600">{t("subtitle")}</p>
      </div>

      {loading || authLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          {t("loading")}
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Heart className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t("emptyTitle")}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t("emptyHint")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            {tc("browseProducts")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <Link href={`/product/${product.slug}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(product.thumbnail) ?? fallbackImage(400, 300, 1)}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
                {!product.in_stock && (
                  <span className="absolute left-3 top-3 rounded-lg bg-gray-900/80 px-2.5 py-1 text-xs font-bold text-white">
                    {tp("outOfStock")}
                  </span>
                )}
                <button
                  onClick={() => void remove(product.id)}
                  disabled={busyId === product.id}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-sm hover:bg-white transition-colors disabled:opacity-60"
                  aria-label={t("removeAria")}
                  title={t("removeAria")}
                >
                  {busyId === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className="h-4 w-4 fill-current" />
                  )}
                </button>
              </div>
              <div className="p-5">
                <Link href={`/product/${product.slug}`} className="hover:text-emerald-700 transition-colors">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <div className="mt-2 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(product.rating_average)
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-gray-500">
                    ({product.rating_count})
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  {product.seller?.shop_name}
                  {product.seller?.verified && (
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </div>
                <button
                  onClick={() => void add(product.id)}
                  disabled={busyId === product.id || !product.in_stock}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {addedId === product.id ? (
                    <>
                      <Check className="h-4 w-4" />
                      {tp("added")}
                    </>
                  ) : product.in_stock ? (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      {t("addToCart")}
                    </>
                  ) : (
                    tp("unavailable")
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}