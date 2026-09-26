"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ShoppingCart, Star, BadgeCheck } from "lucide-react";
import { addToCart, mediaUrl, type Product } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice, fallbackImage } from "@/lib/utils";

export default function ProductCard({
  product,
  badge,
}: {
  product: Product;
  badge?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations("product");
  const [imageError, setImageError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const image =
    (!imageError && mediaUrl(product.thumbnail)) ||
    fallbackImage(400, 300, product.id);

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/auth/login?next=/product/" + product.slug);
      return;
    }
    if (adding || added) return;
    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch {
      setAdded(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={`/product/${product.slug}`} className="group block h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-900/5">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={product.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {badge && (
            <span className="absolute left-3 top-3 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              {badge}
            </span>
          )}
          {!product.in_stock && (
            <span className="absolute right-3 top-3 rounded-lg bg-gray-900/80 px-2.5 py-1 text-xs font-bold text-white">
              {t("outOfStock")}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>
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
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="flex min-w-0 items-center gap-1 truncate text-xs text-gray-500">
              {product.seller?.shop_name}
              {product.seller?.verified && (
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              )}
            </span>
            <button
              onClick={handleAdd}
              disabled={adding || !product.in_stock}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {added ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {t("added")}
                </>
              ) : product.in_stock ? (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {t("add")}
                </>
              ) : (
                t("unavailable")
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}