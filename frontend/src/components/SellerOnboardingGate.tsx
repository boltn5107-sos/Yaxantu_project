"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Store, Rocket, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * Gardien de l'espace vendeur : sans boutique créée, on ne montre jamais
 * les commandes/finances/analyses. Le vendeur passe d'abord par les 5
 * étapes de création de boutique.
 */
export default function SellerOnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const t = useTranslations("sellerGate");

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Store className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {t("reservedTitle")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("reservedDesc")}
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <LogIn className="h-4 w-4" />
          {t("signIn")}
        </Link>
      </div>
    );
  }

  if (!user.seller || !user.seller.is_onboarded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <Store className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          {t("createFirst")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("createFirstDesc")}
        </p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Rocket className="h-4 w-4" />
          {t("createBtn")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}