"use client";

import {
  Store,
  Bike,
  Megaphone,
  Scale,
  Wallet,
  Image,
  BadgePercent,
  Gift,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

const sections = [
  {
    id: "shops",
    icon: Store,
    titleKey: "docs.sections.shops.title",
    subtitleKey: "docs.sections.shops.subtitle",
    itemKeys: [
      "docs.sections.shops.items.identityVerification",
      "docs.sections.shops.items.statuses",
      "docs.sections.shops.items.trustScore",
      "docs.sections.shops.items.commission",
      "docs.sections.shops.items.search",
    ],
  },
  {
    id: "couriers",
    icon: Bike,
    titleKey: "docs.sections.couriers.title",
    subtitleKey: "docs.sections.couriers.subtitle",
    itemKeys: [
      "docs.sections.couriers.items.application",
      "docs.sections.couriers.items.approve",
      "docs.sections.couriers.items.reject",
      "docs.sections.couriers.items.suspend",
      "docs.sections.couriers.items.statuses",
    ],
  },
  {
    id: "influencers",
    icon: Megaphone,
    titleKey: "docs.sections.influencers.title",
    subtitleKey: "docs.sections.influencers.subtitle",
    itemKeys: [
      "docs.sections.influencers.items.applications",
      "docs.sections.influencers.items.commission",
      "docs.sections.influencers.items.withdrawals",
    ],
  },
  {
    id: "disputes",
    icon: Scale,
    titleKey: "docs.sections.disputes.title",
    subtitleKey: "docs.sections.disputes.subtitle",
    itemKeys: [
      "docs.sections.disputes.items.orders",
      "docs.sections.disputes.items.resolutions",
      "docs.sections.disputes.items.closure",
    ],
  },
  {
    id: "payouts",
    icon: Wallet,
    titleKey: "docs.sections.payouts.title",
    subtitleKey: "docs.sections.payouts.subtitle",
    itemKeys: [
      "docs.sections.payouts.items.generation",
      "docs.sections.payouts.items.statuses",
    ],
  },
  {
    id: "banners",
    icon: Image,
    titleKey: "docs.sections.banners.title",
    subtitleKey: "docs.sections.banners.subtitle",
    itemKeys: [
      "docs.sections.banners.items.import",
      "docs.sections.banners.items.fields",
      "docs.sections.banners.items.links",
      "docs.sections.banners.items.deactivation",
    ],
  },
  {
    id: "promoCodes",
    icon: BadgePercent,
    titleKey: "docs.sections.promoCodes.title",
    subtitleKey: "docs.sections.promoCodes.subtitle",
    itemKeys: [
      "docs.sections.promoCodes.items.creation",
      "docs.sections.promoCodes.items.scope",
      "docs.sections.promoCodes.items.limits",
    ],
  },
  {
    id: "referrals",
    icon: Gift,
    titleKey: "docs.sections.referrals.title",
    subtitleKey: "docs.sections.referrals.subtitle",
    itemKeys: [
      "docs.sections.referrals.items.tracking",
      "docs.sections.referrals.items.rewards",
    ],
  },
  {
    id: "moderation",
    icon: ShieldCheck,
    titleKey: "docs.sections.moderation.title",
    subtitleKey: "docs.sections.moderation.subtitle",
    itemKeys: [
      "docs.sections.moderation.items.users",
      "docs.sections.moderation.items.products",
      "docs.sections.moderation.items.audit",
    ],
  },
];

export default function AdminDocsPage() {
  const t = useTranslations("admin");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6 text-emerald-700" />
          {t("docs.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{t("docs.subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-sm leading-relaxed text-gray-700">{t("docs.introduction")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{t(section.titleKey)}</h2>
                  <p className="text-xs text-gray-500">{t(section.subtitleKey)}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {section.itemKeys.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}