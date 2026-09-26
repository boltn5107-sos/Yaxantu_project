"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Store,
  Bike,
  Image,
  Scale,
  Wallet,
  BookOpen,
  Settings,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTranslations } from "next-intl";

const links = [
  { href: "/admin", labelKey: "layout.dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", labelKey: "layout.orders", icon: ShoppingBag },
  { href: "/admin/products", labelKey: "layout.products", icon: Package },
  { href: "/admin/users", labelKey: "layout.users", icon: Users },
  { href: "/admin/sellers", labelKey: "layout.sellers", icon: Store },
  { href: "/admin/couriers", labelKey: "layout.couriers", icon: Bike },
  { href: "/admin/banners", labelKey: "layout.banners", icon: Image },
  { href: "/admin/disputes", labelKey: "layout.disputes", icon: Scale },
  { href: "/admin/payouts", labelKey: "layout.payouts", icon: Wallet },
  { href: "/admin/settings", labelKey: "layout.settings", icon: Settings },
  { href: "/admin/docs", labelKey: "layout.docs", icon: BookOpen },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const canAccess = !!user && user.roles.some((r) => r === "admin" || r === "moderator");

  useEffect(() => {
    if (loading) return;
    if (!user || !canAccess) {
      router.replace("/");
    }
  }, [user, loading, canAccess, router]);

  if (loading || !canAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 px-2 pb-2 text-sm font-semibold text-gray-900">
              <LayoutDashboard className="h-4 w-4 text-emerald-700" />
              {t("layout.administration")}
            </div>
            <nav className="flex flex-col gap-0.5">
              {links.map((link) => {
                const Icon = link.icon;
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-emerald-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(link.labelKey)}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-gray-100" />
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("layout.backToSite")}
              </Link>
            </nav>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}