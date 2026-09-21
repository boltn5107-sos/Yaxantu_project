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
  BadgePercent,
  Gift,
  Megaphone,
  Scale,
  Wallet,
  BookOpen,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/sellers", label: "Boutiques", icon: Store },
  { href: "/admin/couriers", label: "Livreurs", icon: Bike },
  { href: "/admin/banners", label: "Bannières", icon: Image },
  { href: "/admin/promo-codes", label: "Codes promo", icon: BadgePercent },
  { href: "/admin/referrals", label: "Parrainages", icon: Gift },
  { href: "/admin/affiliates", label: "Influenceurs", icon: Megaphone },
  { href: "/admin/disputes", label: "Litiges", icon: Scale },
  { href: "/admin/payouts", label: "Versements", icon: Wallet },
  { href: "/admin/docs", label: "Documentation", icon: BookOpen },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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
              <LayoutDashboard className="h-4 w-4 text-blue-700" />
              Administration
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
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-gray-100" />
              <Link
                href="/"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au site
              </Link>
            </nav>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}