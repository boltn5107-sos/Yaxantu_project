"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Plus,
  BarChart3,
  Package,
  ChevronRight,
  DollarSign,
  Share2,
  Rocket,
  Eye,
  MousePointerClick,
  Shield,
  Reply,
  Loader2,
  LogIn,
} from "lucide-react";
import {
  chooseProfile,
  landingPathFor,
  getMyShop,
  getSellerProducts,
  type MyShop as MyShopData,
  type SellerProduct,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

export default function SellerPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();

  const { data: shop } = useApi(
    () => getMyShop(),
    [],
    null as MyShopData | null,
  );
  const { data: products } = useApi(
    () => getSellerProducts(),
    [],
    [] as SellerProduct[],
  );

  useEffect(() => {
    if (
      authLoading ||
      !user
    ) {
      return;
    }
    if (user.seller && !user.seller.is_onboarded) {
      router.replace("/seller/onboarding");
    }
  }, [authLoading, user, router]);

  const becomeSeller = async () => {
    const updated = await chooseProfile("seller");
    await refresh();
    router.push(landingPathFor(updated));
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
          <Store className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Espace vendeur
        </h1>
        <p className="mt-2 text-gray-600">
          Connectez-vous pour créer votre boutique et
          vendre sur Yaxantu.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <LogIn className="h-4 w-4" />
          Se connecter
        </Link>
      </div>
    );
  }

  if (!user.seller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
          <Store className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Devenir vendeur sur Yaxantu
        </h1>
        <p className="mt-2 text-gray-600">
          Créez votre boutique : nom, logo, catégorie, position et moyen de
          recevoir votre argent. Tout à la voix et en quelques gestes.
        </p>
        <button
          type="button"
          onClick={() => void becomeSeller()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Rocket className="h-4 w-4" />
          Créer ma boutique
        </button>
        <p className="mt-4 text-xs text-gray-500">
          Vous pourrez aussi cumuler les profils Acheteur et Livreur plus tard.
        </p>
      </div>
    );
  }

  // Vendeur sans boutique : la redirection vers l'onboarding a lieu plus
  // haut ; on garde une porte de secours visible si elle est toujours là.
  if (!user.seller.is_onboarded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <Store className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Créez votre boutique
        </h1>
        <p className="mt-2 text-gray-600">
          Votre boutique n&apos;est pas encore créée. Suivez les 5 étapes : logo,
          nom, catégorie, position et paiement.
        </p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Rocket className="h-4 w-4" />
          Créer ma boutique
        </Link>
      </div>
    );
  }

  const stats = shop
    ? [
        { label: "Visites aujourd&apos;hui", value: String(shop.stats.visits_today), icon: Eye, color: "text-blue-700", bg: "bg-blue-50" },
        { label: "Visites au total", value: String(shop.stats.visits_total), icon: MousePointerClick, color: "text-indigo-700", bg: "bg-indigo-50" },
        { label: "Partages", value: String(shop.stats.shares_total), icon: Share2, color: "text-purple-700", bg: "bg-purple-50" },
        { label: "Confiance", value: String(shop.shop.trust_score), icon: Shield, color: "text-emerald-700", bg: "bg-emerald-50" },
      ]
    : [
        { label: "Visites aujourd&apos;hui", value: "…", icon: Eye, color: "text-blue-700", bg: "bg-blue-50" },
        { label: "Visites au total", value: "…", icon: MousePointerClick, color: "text-indigo-700", bg: "bg-indigo-50" },
        { label: "Partages", value: "…", icon: Share2, color: "text-purple-700", bg: "bg-purple-50" },
        { label: "Confiance", value: "…", icon: Shield, color: "text-emerald-700", bg: "bg-emerald-50" },
      ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Store className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.seller.shop_name ?? "Espace vendeur"}
            </h1>
          </div>
          <p className="text-gray-600">
            Gérez votre boutique, vos produits, ventes et retraits.
          </p>
        </div>
        <Link
          href="/seller/products/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Rocket className="h-5 w-5" />
              Faites connaître votre boutique
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              Partagez votre lien sur WhatsApp, Instagram ou TikTok et suivez
              les visites en temps réel.
            </p>
          </div>
          <Link
            href="/seller/shop"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Partager ma boutique
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/seller/shop" className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Ma boutique</p>
              <p className="text-xs text-gray-600">Partage et visites</p>
            </div>
          </div>
        </Link>
        <Link href="/seller/products" className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Mes produits</p>
              <p className="text-xs text-gray-600">{products.length} publié{products.length > 1 ? "s" : ""}</p>
            </div>
          </div>
        </Link>
        <Link href="/seller/orders" className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Commandes</p>
              <p className="text-xs text-gray-600">Suivi et expédition</p>
            </div>
          </div>
        </Link>
        <Link href="/seller/finances" className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Finances</p>
              <p className="text-xs text-gray-600">Comptes et retraits</p>
            </div>
          </div>
        </Link>
        <Link href="/seller/reviews" className="rounded-2xl border border-gray-200 bg-white p-5 hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Reply className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Avis clients</p>
              <p className="text-xs text-gray-600">Répondre aux avis</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <Package className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Mes produits</h2>
          </div>
          <Link
            href="/seller/products"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
          >
            Voir tout
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {products.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">
              Aucun produit pour le moment. Ajoutez votre premier produit pour
              remplir votre boutique.
            </p>
            <Link
              href="/seller/products/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter un produit
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {products.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {product.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.thumbnail}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {formatPrice(product.price)} • Stock : {product.stock_quantity}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    product.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {product.is_active ? "Actif" : "En pause"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}