"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  Heart,
  LayoutDashboard,
  Smartphone,
  Shirt,
  Home,
  Apple,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { getCart, getFavorites, type Cart } from "@/lib/api";

const categories = [
  { name: "Électronique", href: "/category/electronique", icon: Smartphone },
  { name: "Mode & Beauté", href: "/category/mode-beaute", icon: Shirt },
  { name: "Maison", href: "/category/maison-electromenager", icon: Home },
  { name: "Alimentation", href: "/category/alimentation", icon: Apple },
] as const;

const EMPTY_CART: Cart = {
  id: null,
  status: "active",
  currency: "XOF",
  items: [],
  subtotal: 0,
  shipping: 0,
  total: 0,
  count: 0,
};

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

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

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              Yaxantu
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Accueil
              </Link>
              <Link href="/search" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Recherche
              </Link>
              {user?.roles?.includes?.("seller") && (
                <Link href="/seller/orders" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  Mes ventes
                </Link>
              )}
              {user?.roles?.includes?.("delivery") && (
                <Link href="/delivery" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  Livraisons
                </Link>
              )}
              <Link href="/seller" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Vendre
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Réglages
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="hidden md:inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-white transition-colors"
            >
              <Search className="h-4 w-4" />
              Rechercher...
            </Link>

            <Link
              href="/favorites"
              className="relative inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Favoris"
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
              aria-label="Panier"
            >
              <ShoppingCart className="h-5 w-5" />
              {!loading && cart.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {cart.count > 9 ? "9+" : cart.count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline max-w-28 truncate">{user.name.split(" ")[0]}</span>
                </Link>
                <button
                  onClick={() => void signOut()}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              !loading && (
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline">Connexion</span>
                </Link>
              )
            )}

            <button
              className="lg:hidden inline-flex items-center justify-center rounded-xl p-2 text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 border-t border-gray-100 py-2 overflow-x-auto">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.name}
                href={category.href}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
                {category.name}
              </Link>
            );
          })}
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-200 pb-4 pt-3">
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <nav className="flex flex-col gap-1">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.name}
                    href={category.href}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </Link>
                );
              })}
              <div className="my-1 border-t border-gray-200" />
              <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Accueil
              </Link>
              <Link href="/search" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Recherche avancée
              </Link>
              <Link href="/seller" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Espace vendeur
              </Link>
              <Link href="/delivery" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Espace livreur
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Paramètres
              </Link>
              <Link href="/cart" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Panier
              </Link>
              <Link href="/orders" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Commandes
              </Link>
              <Link href="/profile" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
                Profil
              </Link>
              {user ? (
                <button
                  onClick={() => void signOut()}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              ) : (
                <Link href="/auth/login" className="rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50" onClick={() => setMobileOpen(false)}>
                  Se connecter
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}