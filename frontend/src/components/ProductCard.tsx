"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart, Star, BadgeCheck } from "lucide-react";
import { addToCart, type Product } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

export default function ProductCard({
  product,
  badge,
}: {
  product: Product;
  badge?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const image =
    (!imageError && product.thumbnail) || "/api/placeholder/400/300";

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
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:shadow-lg">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={product.name}
            onError={() => setImageError(true)}
            className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {badge && (
            <span className="absolute left-3 top-3 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              {badge}
            </span>
          )}
          {!product.in_stock && (
            <span className="absolute right-3 top-3 rounded-lg bg-gray-900/80 px-2.5 py-1 text-xs font-bold text-white">
              Rupture
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
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
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {product.seller?.shop_name}
              {product.seller?.verified && (
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
              )}
            </span>
            <button
              onClick={handleAdd}
              disabled={adding || !product.in_stock}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {added ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Ajouté
                </>
              ) : product.in_stock ? (
                <>
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Ajouter
                </>
              ) : (
                "Indisponible"
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}