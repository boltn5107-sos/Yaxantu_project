"use client";

import Link from "next/link";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Link as IntlLink } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  Heart,
  LogOut,
  Bell,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { categoryName } from "@/lib/categoryName";
import CategoryIcon from "@/components/CategoryIcon";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  getCart,
  getFavorites,
  getUnreadNotificationsCount,
  getCategories,
  getConversations,
  mediaUrl,
  EMPTY_CART,
  type Category,
} from "@/lib/api";

const fallbackCategories: { name: string; href: string; slug: string }[] = [
  { name: "Électronique", href: "/category/electronique", slug: "electronique" },
  { name: "Mode & Beauté", href: "/category/mode-beaute", slug: "mode-beaute" },
  { name: "Maison", href: "/category/maison-electromenager", slug: "maison-electromenager" },
  { name: "Alimentation", href: "/category/alimentation", slug: "alimentation" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { user, loading, signOut } = useAuth();
  const t = useTranslations("nav");
  const ct = useTranslations("categories");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const { data: cart } = useApi(
    async () => (user ? getCart() : Promise.resolve(EMPTY_CART)),
    [user?.id],
    EMPTY_CART,
  );

  const { data: favorites } = useApi(
    async () => (user ? getFavorites() : Promise.resolve([])),
    [user?.id],
    [] as Awaited<ReturnType<typeof getFavorites>>,
  );

  const { data: unread } = useApi(
    async () => (user ? getUnreadNotificationsCount() : Promise.resolve(0)),
    [user?.id],
    0,
  );

  const { data: navCategories } = useApi(getCategories, [], [] as Category[]);

  const { data: conversations } = useApi(
    async () => (user ? getConversations() : Promise.resolve([])),
    [user?.id],
    [] as Awaited<ReturnType<typeof getConversations>>,
  );

  const unreadMessages = conversations.reduce(
    (sum, c) => sum + (c.unread_count ?? 0),
    0,
  );

  const categories =
    navCategories.length > 0
      ? navCategories
          .filter((c) => c.is_main)
          .map((c) => ({
            name: categoryName(ct, c.name, c.slug),
            href: `/category/${c.slug}`,
            slug: c.slug,
          }))
      : fallbackCategories;

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  const navLinkClass = (href: string, exact = false) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive(href, exact)
        ? "bg-emerald-50 text-emerald-700"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(search.trim())}`);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image/logo.png"
                alt="Taaba-taaba"
                className="h-9 w-9 rounded-[10px] object-cover shadow-sm"
              />
              <span className="text-xl font-bold tracking-wider text-emerald-700">
                taaba-taaba
              </span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              <Link href="/" className={navLinkClass("/", true)}>
                {t("home")}
              </Link>
              <Link href="/search" className={navLinkClass("/search")}>
                {t("search")}
              </Link>
              {user?.roles?.includes?.("delivery") && (
                <Link href="/delivery" className={navLinkClass("/delivery")}>
                  {t("deliveries")}
                </Link>
              )}
              {(user?.roles?.includes?.("admin") || user?.roles?.includes?.("moderator")) && (
                <Link href="/admin" className={navLinkClass("/admin")}>
                  {t("admin")}
                </Link>
              )}
              <Link href="/seller" className={navLinkClass("/seller")}>
                {t("sell")}
              </Link>
              <Link href="/messages" className={navLinkClass("/messages")}>
                {t("messages")}
              </Link>
              <Link href="/settings" className={navLinkClass("/settings")}>
                {t("settings")}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <Link
              href="/search"
              className="hidden md:inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-white transition-colors"
            >
              <Search className="h-4 w-4" />
              {t("searchPlaceholder")}
            </Link>

            <Link
              href="/favorites"
              className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={t("favoritesAria")}
            >
              <Heart className="h-5 w-5" />
              {!loading && favorites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {favorites.length > 9 ? "9+" : favorites.length}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={t("cartAria")}
            >
              <ShoppingCart className="h-5 w-5" />
              {!loading && cart.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                  {cart.count > 9 ? "9+" : cart.count}
                </span>
              )}
            </Link>

            {user && (
              <Link
                href="/notifications"
                className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label={t("notificationsAria")}
              >
                <Bell className="h-5 w-5" />
                {!loading && unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            )}

            {user && (
              <Link
                href="/messages"
                className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label={t("messagesAria")}
              >
                <MessageCircle className="h-5 w-5" />
                {!loading && unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(user.avatar) ?? ""}
                      alt={user.name}
                      className="h-6 w-6 rounded-full object-cover border border-white/40"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="hidden md:inline max-w-28 truncate">{user.name.split(" ")[0]}</span>
                </Link>
                <button
                  onClick={() => void signOut()}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label={t("signOut")}
                  title={t("signOut")}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              !loading && (
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">{t("login")}</span>
                </Link>
              )
            )}

            <button
              className="lg:hidden inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={t("menu")}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 border-t border-gray-100 py-2 overflow-x-auto">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <CategoryIcon slug={category.slug} className="h-3.5 w-3.5 text-emerald-600" />
              {category.name}
            </Link>
          ))}
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 pb-4 pt-3">
            <div className="mb-3">
              <form onSubmit={submitSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </form>
            </div>
            <nav className="flex flex-col gap-1">
              {categories.map((category) => (
                <Link
                  key={category.href}
                  href={category.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileOpen(false)}
                >
                  <CategoryIcon slug={category.slug} className="h-4 w-4 text-emerald-600" />
                  {category.name}
                </Link>
              ))}
              <div className="my-1 border-t border-gray-200" />
              <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("home")}
              </Link>
              <Link href="/search" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("advancedSearch")}
              </Link>
              <Link href="/seller" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("sellerSpace")}
              </Link>
              <Link href="/delivery" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("deliverySpace")}
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("mobileSettings")}
              </Link>
              <Link href="/cart" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("cart")}
              </Link>
              <Link href="/orders" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("orders")}
              </Link>
              <Link href="/messages" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("messages")}
              </Link>
              <Link href="/profile" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                {t("profile")}
              </Link>
              {user ? (
                <button
                  onClick={() => void signOut()}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {t("signOut")}
                </button>
              ) : (
                <Link href="/auth/login" className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50" onClick={() => setMobileOpen(false)}>
                  {t("signIn")}
                </Link>
              )}
              <div className="my-1 border-t border-gray-200" />
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-sm text-gray-500">{t("language")}</span>
                <div className="flex items-center gap-1">
                  {(["fr", "wo"] as const).map((code) => (
                    <IntlLink
                      key={code}
                      href={pathname}
                      locale={code}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        code === locale
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {code === "fr" ? "Français" : "Wolof"}
                    </IntlLink>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}