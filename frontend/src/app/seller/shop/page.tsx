"use client";

import Link from "next/link";
import {
  Store,
  Share2,
  Eye,
  MousePointerClick,
  Users,
  Rocket,
  BadgeCheck,
  Loader2,
  Copy as CopyIcon,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import {
  getMyShop,
  trackShopShare,
  SHARE_CHANNELS,
  type MyShop as MyShopData,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import ShopShare from "@/components/ShopShare";

export default function MyShopPage() {
  const { data, loading } = useApi(
    () => getMyShop(),
    [],
    null as MyShopData | null,
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-gray-600">
          Rechargez la page ou réessayez plus tard.
        </p>
      </div>
    );
  }

  if (!data.shop.is_onboarded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <Store className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Créez d&apos;abord votre boutique
        </h1>
        <p className="mt-2 text-gray-600">
          Terminez les 5 étapes d&apos;onboarding pour obtenir votre lien de
          partage et ajouter des produits.
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

  const { shop, stats } = data;
  const channelCount = (id: string) => stats.shares_by_channel[id] ?? 0;

  const statCards = [
    { label: "Visites aujourd&apos;hui", value: stats.visits_today, icon: Eye, tint: "bg-blue-50 text-blue-700" },
    { label: "Visites au total", value: stats.visits_total, icon: MousePointerClick, tint: "bg-indigo-50 text-indigo-700" },
    { label: "Partages", value: stats.shares_total, icon: Share2, tint: "bg-purple-50 text-purple-700" },
    { label: "Boutiques parrainées", value: stats.sponsored_shops, icon: Users, tint: "bg-emerald-50 text-emerald-700" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Ma boutique
            </h1>
            <p className="text-gray-600">
              Partagez votre lien et suivez les visites.
            </p>
          </div>
        </div>
        <Link
          href={`/seller/${shop.slug}`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Voir la boutique publique
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {shop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shop.logo}
              alt={shop.shop_name}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
              <Store className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {shop.shop_name}
              </h2>
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-0.5 text-sm text-gray-600">
              Confiance {shop.trust_score}{shop.payout_method ? ` • Retrait ${shop.payout_method}` : ""} •{" "}
              <span className="flex w-fit items-center gap-1 text-blue-700">
                <CopyIcon className="h-3.5 w-3.5" />
                /seller/{shop.slug}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tint}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">
                  {item.value}
                </p>
                <p className="text-xs text-gray-600">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Share2 className="h-5 w-5 text-blue-600" />
          Partager ma boutique
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Choisissez votre canal préféré : chaque clic est compté pour savoir
          où vos clients arrivent.
        </p>
        <div className="mt-4">
          <ShopShare
            shopName={shop.shop_name}
            link={shop.share_link}
            onShare={(channel) => void trackShopShare(channel)}
          />
        </div>

        <div className="mt-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Classement de vos canaux
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SHARE_CHANNELS.map((channel) => (
              <span
                key={channel.id}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                {channel.label}
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-white">
                  {channelCount(channel.id)}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Astuce : privilégiez le canal où vous avez déjà le plus de
            partages, vos amis y sont actifs.
          </p>
        </div>
      </div>
    </div>
  );
}