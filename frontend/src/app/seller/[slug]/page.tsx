"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  Store,
  MapPin,
  Star,
  BadgeCheck,
  Shield,
  Share2,
  Package,
  ShoppingBag,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  getShop,
  trackShopShare,
  type ShopData,
  type ShopProduct,
  type PublicShop,
  type Product,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import ProductCard from "@/components/ProductCard";
import ShopShare from "@/components/ShopShare";

function toFeaturedProduct(shop: PublicShop, p: ShopProduct): Product {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    short_description: p.short_description,
    description: null,
    price: p.price,
    currency: p.currency,
    stock_quantity: p.stock_quantity,
    in_stock: p.in_stock,
    rating_average: p.rating_average,
    rating_count: p.rating_count,
    is_featured: false,
    is_active: true,
    requires_shipping: p.requires_shipping,
    thumbnail: p.thumbnail,
    images: p.images.map((image) => ({ ...image })),
    seller: {
      id: shop.id,
      shop_name: shop.shop_name,
      slug: shop.slug,
      logo: shop.logo,
      verification_level: shop.verification_level,
      verified: shop.verified,
    },
    category: shop.category,
    created_at: null,
  };
}

export default function PublicShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useAuth();

  const { data, loading, error } = useApi(
    () => getShop(slug),
    [slug],
    null as ShopData | null,
  );

  const [shareOpen, setShareOpen] = useState(false);

  const notFound =
    Boolean(error) && (error as { status?: number } | null)?.status === 404;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <Store className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Boutique introuvable
        </h1>
        <p className="mt-2 text-gray-600">
          Ce lien est peut-être invalide, ou le vendeur a fermé sa boutique.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Explorer le marché
        </Link>
      </div>
    );
  }

  const { shop, products } = data;
  const isOwner = user?.seller?.slug === shop.slug;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
        <div className="h-36 bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600" />
        <div className="relative px-6 pb-8 sm:px-10">
          <div className="-mt-14 flex flex-col sm:flex-row sm:items-end gap-4">
            {shop.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logo}
                alt={shop.shop_name}
                className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-blue-600 shadow-lg">
                <Store className="h-10 w-10 text-white" />
              </div>
            )}
            <div className="flex-1 pt-4 sm:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {shop.shop_name}
                </h1>
                {shop.verified && (
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                )}
                {shop.verified && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Boutique vérifiée
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <strong>
                    {shop.rating_count > 0 ? shop.rating_average.toFixed(1) : "—"}
                  </strong>
                  <span>({shop.rating_count})</span>
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingBag className="h-4 w-4 text-gray-400" />
                  {shop.sales_count} ventes
                </span>
                {shop.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {shop.location}
                  </span>
                )}
                {shop.member_since && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {new Date(shop.member_since).toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShareOpen((open) => !open)}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Partager
            </button>
          </div>

          {shareOpen && (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <ShopShare
                shopName={shop.shop_name}
                link={shop.share_link}
                onShare={isOwner ? (channel) => void trackShopShare(channel) : undefined}
              />
            </div>
          )}

          {shop.description && (
            <p className="mt-5 max-w-3xl text-gray-700">{shop.description}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {shop.category && (
              <Link
                href={`/category/${shop.category.slug}`}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                {shop.category.name}
              </Link>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              Confiance {shop.trust_score}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Package className="h-5 w-5 text-blue-600" />
            Produits de la boutique
          </h2>
          <span className="text-sm text-gray-600">
            {data.meta.total_products} produit{data.meta.total_products > 1 ? "s" : ""}
          </span>
        </div>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-gray-600">
              Cette boutique n&apos;a pas encore publié de produits.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={toFeaturedProduct(shop, product)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          Continuer mes achats
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}