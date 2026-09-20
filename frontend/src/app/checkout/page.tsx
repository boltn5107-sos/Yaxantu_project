"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  ShieldCheck,
  Smartphone,
  Loader2,
  Banknote,
} from "lucide-react";
import {
  getCart,
  getPaymentMethods,
  getAddresses,
  checkout,
  type Cart,
  type Address,
  type ApiError,
  type PaymentMethod,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

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

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { data: remoteCart, loading: cartLoading } = useApi(
    async () => (user ? getCart() : Promise.resolve(EMPTY_CART)),
    [user?.id],
    EMPTY_CART,
  );
  const { data: methods } = useApi<PaymentMethod[]>(
    () => getPaymentMethods(),
    [],
    [
      { id: "cod", label: "Paiement à la livraison", description: "Payez en espèces à la réception." },
      { id: "mobile_money", label: "Mobile Money", description: "MTN / Orange Money." },
    ],
  );
  const { data: addresses } = useApi<Address[]>(
    async () => (user ? getAddresses() : Promise.resolve([])),
    [user?.id],
    [],
  );

  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state_province: "",
    postal_code: "",
    country_code: "CM",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [provider, setProvider] = useState("momo");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [addressId, setAddressId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [shippingApproved, setShippingApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (remoteCart) setCart(remoteCart);
  }, [remoteCart]);

  useEffect(() => {
    if (authLoading || cartLoading) return;
    if (!user) {
      router.push("/auth/login?next=/checkout");
      return;
    }
    if (cart.count === 0 && !submitting) {
      router.push("/cart");
    }
  }, [user, authLoading, cartLoading, cart.count, submitting, router]);

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const applySavedAddress = (id: string) => {
    const addr = addresses.find((a) => a.id === Number(id));
    setAddressId(Number(id));
    if (addr) {
      setForm((prev) => ({
        ...prev,
        first_name: addr.first_name ?? "",
        last_name: addr.last_name ?? "",
        phone: addr.phone ?? "",
        address_line1: addr.address_line1,
        address_line2: addr.address_line2 ?? "",
        city: addr.city,
        state_province: addr.state_province ?? "",
        postal_code: addr.postal_code ?? "",
        country_code: addr.country_code,
      }));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const address =
      addressId !== ""
        ? undefined
        : {
            first_name: form.first_name || undefined,
            last_name: form.last_name || undefined,
            address_line1: form.address_line1,
            address_line2: form.address_line2 || undefined,
            city: form.city,
            state_province: form.state_province || undefined,
            postal_code: form.postal_code || undefined,
            country_code: form.country_code || "CM",
            phone: form.phone || undefined,
          };

    try {
      const result = await checkout({
        ...(address
          ? { address }
          : { shipping_address_id: addressId === "" ? undefined : addressId }),
        payment_method: paymentMethod,
        shipping_approved: shippingApproved,
        ...(paymentMethod === "mobile_money"
          ? { mobile_money_phone: mobileMoneyPhone, mobile_money_provider: provider }
          : {}),
        notes: form.notes || undefined,
      });

      const created = result.data[0]?.order_number;
      router.push(created ? `/orders/${created}?created=1` : "/orders?created=1");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 401) {
        router.push("/auth/login?next=/checkout");
      } else if (apiErr.status === 422 && apiErr.errors) {
        setFieldErrors(apiErr.errors);
        setError("Certains champs sont invalides.");
      } else {
        setError(apiErr instanceof Error ? apiErr.message : "Erreur réseau.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (key: string) =>
    `w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
      fieldErrors[key]
        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
    }`;

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <p className="mt-1 text-xs text-red-600">{fieldErrors[key][0]}</p>
    ) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Finaliser la commande</h1>
        <p className="mt-1 text-gray-600">
          Remplissez les informations pour valider votre achat.
        </p>
      </div>

      {!authLoading && !cartLoading && cart.count === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-900">Votre panier est vide.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
            Parcourir les produits
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-semibold text-gray-900">Adresse de livraison</h2>
              </div>

              {addresses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Utiliser une adresse enregistrée
                  </label>
                  <select
                    value={addressId}
                    onChange={(e) => applySavedAddress(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">— Saisir une nouvelle adresse —</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input value={form.first_name} onChange={update("first_name")} className={inputClass("address.first_name")} />
                  {fieldError("address.first_name")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input value={form.last_name} onChange={update("last_name")} className={inputClass("address.last_name")} />
                  {fieldError("address.last_name")}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input value={form.phone} onChange={update("phone")} placeholder="+237 6XX XXX XXX" className={inputClass("address.phone")} />
                  {fieldError("address.phone")}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse <span className="text-red-500">*</span>
                  </label>
                  <input value={form.address_line1} onChange={update("address_line1")} placeholder="Quartier, rue, immeuble…" className={inputClass("address.address_line1")} />
                  {fieldError("address.address_line1")}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complément (optionnel)</label>
                  <input value={form.address_line2} onChange={update("address_line2")} className={inputClass("address.address_line2")} />
                  {fieldError("address.address_line2")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville <span className="text-red-500">*</span>
                  </label>
                  <input value={form.city} onChange={update("city")} className={inputClass("address.city")} />
                  {fieldError("address.city")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Région / Province</label>
                  <input value={form.state_province} onChange={update("state_province")} className={inputClass("address.state_province")} />
                  {fieldError("address.state_province")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  <input value={form.country_code} onChange={update("country_code")} className={inputClass("address.country_code")} />
                  {fieldError("address.country_code")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code postal (optionnel)</label>
                  <input value={form.postal_code} onChange={update("postal_code")} className={inputClass("address.postal_code")} />
                  {fieldError("address.postal_code")}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-gray-900">Paiement</h2>
              </div>

              <div className="space-y-3">
                {methods.map((option) => {
                  const Icon = option.id === "cod" ? Banknote : Smartphone;
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        paymentMethod === option.id ? "border-blue-600 bg-blue-50/50" : "border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={option.id}
                        checked={paymentMethod === option.id}
                        onChange={() => setPaymentMethod(option.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <Icon className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                        <p className="text-xs text-gray-600">{option.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {paymentMethod === "mobile_money" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Opérateur
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="momo">MTN Mobile Money</option>
                      <option value="orange">Orange Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro Mobile Money
                    </label>
                    <input
                      value={mobileMoneyPhone}
                      onChange={(e) => setMobileMoneyPhone(e.target.value)}
                      placeholder="06XXXXXXXX"
                      className={inputClass("mobile_money_phone")}
                    />
                    {fieldError("mobile_money_phone")}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {cart.shipping > 0 && (
              <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingApproved}
                  onChange={(e) => setShippingApproved(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-emerald-600"
                />
                <span>
                  J&apos;accepte les frais de livraison de{" "}
                  <strong>{formatPrice(cart.shipping)}</strong> qui s&apos;ajoutent
                  au total ci-dessous.
                </span>
              </label>
            )}

            <div className="flex items-center justify-between">
              <Link href="/cart" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                Retour au panier
              </Link>
              <button
                type="submit"
                disabled={submitting || cart.count === 0 || (cart.shipping > 0 && !shippingApproved)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmer la commande
              </button>
            </div>
          </div>

          <aside>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 text-gray-700">
                    <span className="flex-1 line-clamp-2">
                      {item.quantity} × {item.product?.name}
                    </span>
                    <span className="font-medium whitespace-nowrap">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 text-sm">
                <div className="flex items-center justify-between text-gray-700">
                  <span>Sous-total</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-700">
                  <span>Livraison</span>
                  <span className={cart.shipping === 0 ? "text-emerald-700 font-medium" : ""}>
                    {cart.shipping === 0 ? "Gratuite" : formatPrice(cart.shipping)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}