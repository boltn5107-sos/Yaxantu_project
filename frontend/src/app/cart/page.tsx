"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Truck,
  ShieldCheck,
} from "lucide-react";
import {
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  type Cart,
  type ApiError,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice, fallbackImage } from "@/lib/utils";

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

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: remoteCart, errorStatus, loading } = useApi(
    async () => (user ? getCart() : Promise.resolve(EMPTY_CART)),
    [user?.id],
    EMPTY_CART,
  );

  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (remoteCart) setCart(remoteCart);
  }, [remoteCart]);

  useEffect(() => {
    if (errorStatus === 401 && !authLoading && !user) {
      router.push("/auth/login?next=/cart");
    }
  }, [errorStatus, user, authLoading, router]);

  const act = async (
    itemId: number,
    fn: () => Promise<Cart>,
  ): Promise<void> => {
    setBusyId(itemId);
    setActionError(null);
    try {
      setCart(await fn());
    } catch (err) {
      if ((err as ApiError).status === 401) {
        router.push("/auth/login?next=/cart");
      } else {
        setActionError(err instanceof Error ? err.message : "Erreur réseau.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const changeQuantity = (itemId: number, delta: number) => {
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) return;
    const next = Math.max(1, item.quantity + delta);
    if (next === item.quantity) return;
    void act(itemId, () => updateCartItem(itemId, next));
  };

  const remove = (itemId: number) => {
    void act(itemId, () => removeCartItem(itemId));
  };

  const clear = async () => {
    setActionError(null);
    try {
      await clearCart();
      setCart(EMPTY_CART);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur réseau.");
    }
  };

  const items = cart.items ?? [];
  const subtotal = cart.subtotal ?? 0;
  const shipping = cart.shipping ?? 0;
  const total = cart.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mon panier</h1>
          <p className="mt-1 text-gray-600">
            {items.length} article{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Continuer les achats
        </Link>
      </div>

      {actionError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading || authLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          Chargement du panier…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Votre panier est vide</h2>
          <p className="mt-2 text-sm text-gray-600">Découvrez nos catégories et ajoutez des articles à votre panier.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Parcourir les produits
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.product?.image || fallbackImage(120, 120, 0)}
                      alt={item.product?.name ?? "Article"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.product?.slug}`} className="hover:text-blue-700 transition-colors">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 line-clamp-2">
                        {item.product?.name ?? "Article"}
                      </h3>
                    </Link>
                    <p className="mt-1 text-sm text-gray-600">
                      Vendeur : {item.product?.seller ?? "—"}
                    </p>
                    <p className="mt-2 text-base font-bold text-gray-900">
                      {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <button
                      onClick={() => remove(item.id)}
                      disabled={busyId === item.id}
                      className="inline-flex items-center justify-center rounded-xl p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeQuantity(item.id, -1)}
                        disabled={busyId === item.id || item.quantity <= 1}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        aria-label="Diminuer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => changeQuantity(item.id, 1)}
                        disabled={busyId === item.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        aria-label="Augmenter"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <button
                onClick={() => void clear()}
                className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
              >
                Vider le panier
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900">Récapitulatif</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-700">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>Livraison</span>
                  <span className={shipping === 0 ? "text-emerald-700 font-medium" : ""}>
                    {shipping === 0 ? "Gratuite" : formatPrice(shipping)}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-500">
                    Plus que {formatPrice(25000 - subtotal)} pour la livraison gratuite.
                  </p>
                )}
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              <Link
                href="/checkout"
                className="mt-6 flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Passer la commande
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  Paiement sécurisé
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Livraison suivie
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}