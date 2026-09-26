"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  Search,
  ShoppingCart,
  Heart,
  User,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

type Item = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export default function MobileNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { user } = useAuth();

  const items: Item[] = [
    {
      href: "/",
      labelKey: "home",
      icon: Home,
      match: (p) => p === "/",
    },
    {
      href: "/search",
      labelKey: "search",
      icon: Search,
      match: (p) => p.startsWith("/search"),
    },
    {
      href: "/cart",
      labelKey: "cartAria",
      icon: ShoppingCart,
      match: (p) => p.startsWith("/cart"),
    },
    {
      href: "/favorites",
      labelKey: "favoritesAria",
      icon: Heart,
      match: (p) => p.startsWith("/favorites"),
    },
    {
      href: user ? "/profile" : "/auth/login",
      labelKey: "profile",
      icon: User,
      match: (p) =>
        p.startsWith("/profile") ||
        p.startsWith("/auth/login") ||
        p.startsWith("/settings"),
    },
  ];

  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.labelKey}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 pt-2.5 pb-1.5 text-[10px] font-medium transition-colors ${
                active
                  ? "text-emerald-700"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`}
                aria-hidden="true"
              />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}