"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ImagePlus,
  PackageCheck,
  MapPin,
  Coins,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Store,
} from "lucide-react";
import {
  getSellerOnboarding,
  sellerStep1,
  sellerStep,
  getCategories,
  type Category,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { positionPin } from "@/lib/leafletPin";
import { categoryName } from "@/lib/categoryName";
import CategoryIcon from "@/components/CategoryIcon";

const stepKeys = [
  "onboarding.steps.logo",
  "onboarding.steps.name",
  "onboarding.steps.category",
  "onboarding.steps.position",
  "onboarding.steps.payment",
] as const;

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      address?: {
        road?: string;
        neighbourhood?: string;
        suburb?: string;
        city?: string;
        town?: string;
        state?: string;
      };
    };
    const parts = [
      data.address?.road ?? data.address?.neighbourhood ?? data.address?.suburb,
      data.address?.city ?? data.address?.town ?? data.address?.state,
    ].filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

const payoutMethods = [
  {
    id: "wave",
    label: "Wave",
    color: "bg-sky-500",
  },
  {
    id: "orange",
    label: "Orange Money",
    color: "bg-orange-500",
  },
] as const;

const payoutHintKeys = {
  wave: "onboarding.payoutMethods.waveHint",
  orange: "onboarding.payoutMethods.orangeHint",
} as const;

export default function SellerOnboarding() {
  const t = useTranslations("seller");
  const ct = useTranslations("categories");
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [payout, setPayout] = useState<{ method: string; account: string }>({
    method: "wave",
    account: user?.phone ?? "",
  });
  const [locality, setLocality] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    setMarker: (latNum: number, lngNum: number) => void;
  } | null>(null);

  useEffect(() => {
    void getSellerOnboarding()
      .then((p) => {
        if (p.is_onboarded) setDone(true);
        else setStep(Math.min(p.current_step + 1, 5));
      })
      .catch(() => undefined);
    void getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const applyPosition = useCallback((latNum: number, lngNum: number) => {
    setLat(latNum.toFixed(6));
    setLng(lngNum.toFixed(6));
    setLocality(null);
    setNotice(null);
    leafletRef.current?.setMarker(latNum, lngNum);
    void reverseGeocode(latNum, lngNum).then((name) => {
      if (name) {
        setLocality(name);
        setAddress((prev) => prev || name);
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let disposed = false;
    let mapInstance: import("leaflet").Map | null = null;

    void import("leaflet").then(async (L) => {
      await import("leaflet/dist/leaflet.css");
      if (disposed || !mapDivRef.current) return;
      const map = L.map(mapDivRef.current, {
        scrollWheelZoom: false,
      }).setView([4.05, 9.69], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      let marker: import("leaflet").Marker | null = null;
      const setMarker = (latNum: number, lngNum: number) => {
        if (marker) marker.setLatLng([latNum, lngNum]);
        else
          marker = L.marker([latNum, lngNum], {
            icon: L.divIcon(positionPin),
          }).addTo(map);
        map.panTo([latNum, lngNum]);
      };

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        applyPosition(e.latlng.lat, e.latlng.lng);
      });

      // Recalcule le rendu une fois la tuile de conteneur réellement posée
      // (évite une petite carte rendue dans un coin, le reste en blanc).
      window.requestAnimationFrame(() => map.invalidateSize());

      mapInstance = map;
      leafletRef.current = { map, setMarker };
    });

    return () => {
      disposed = true;
      mapInstance?.remove();
      leafletRef.current = null;
    };
  }, [step, applyPosition]);

  const next = () => {
    setStep((s) => Math.min(s + 1, 5));
    setNotice(null);
    setError(null);
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 1));
    setNotice(null);
    setError(null);
  };

  const run = async (action: () => Promise<void>) => {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("onboarding.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitLogo = () =>
    run(async () => {
      if (!logo) throw new Error(t("onboarding.errors.logoRequired"));
      await sellerStep1(logo);
      setNotice(t("onboarding.notices.logoReceived"));
      next();
    });

  const submitName = () =>
    run(async () => {
      if (shopName.trim().length < 1) throw new Error(t("onboarding.errors.nameRequired"));
      await sellerStep(2, { shop_name: shopName.trim() });
      setNotice(t("onboarding.notices.nameSaved", { name: shopName.trim() }));
      next();
    });
    const submitCategory = () =>
    run(async () => {
      if (!categoryId) throw new Error(t("onboarding.errors.categoryRequired"));
      await sellerStep(3, { main_category_id: categoryId });
      setNotice(t("onboarding.notices.categorySaved"));
      next();
    });

  const submitLocation = () =>
    run(async () => {
      if (!lat || !lng) throw new Error(t("onboarding.errors.locationRequired"));
      await sellerStep(4, {
        location_lat: lat,
        location_lng: lng,
        location_address: address || null,
      });
      next();
    });

  const submitPayout = () =>
    run(async () => {
      if (payout.account.trim().length < 4) throw new Error(t("onboarding.errors.accountRequired"));
      await sellerStep(5, {
        payout_method: payout.method,
        payout_account: payout.account.trim(),
      });
      await refresh();
      router.push("/seller/products/new?created=1");
    });

  const localize = () => {
    if (!("geolocation" in navigator)) {
      setError(t("onboarding.errors.geolocationUnavailable"));
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos.coords.latitude, pos.coords.longitude);
        setNotice(t("onboarding.notices.locationSaved"));
      },
      () => setError(t("onboarding.errors.geolocationFailed")),
    );
  };

  if (done) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.complete.title")}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {t("onboarding.complete.description")}
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              href="/seller/orders"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <PackageCheck className="h-4 w-4" />
              {t("onboarding.complete.viewOrders")}
            </Link>
            <Link
              href="/seller/finances"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("onboarding.complete.accountsAndWithdrawals")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t("onboarding.title")}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {t("onboarding.stepProgress", { step })}
        </p>
        <div className="mx-auto mt-6 flex max-w-md items-center gap-1.5">
          {stepKeys.map((key, index) => {
            const active = index + 1 === step;
            const reached = index + 1 < step;
            return (
              <div key={key} title={t(key)} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    active ? "bg-emerald-600" : reached ? "bg-emerald-400" : "bg-gray-200"
                  }`}
                />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          {t(stepKeys[step - 1])}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">{t("onboarding.logo.title")}</h2>
            {logoPreview ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt={t("onboarding.logo.alt")}
                  className="h-24 w-24 rounded-2xl border border-gray-200 object-cover"
                />
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogo(null);
                      setLogoPreview(null);
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    {t("onboarding.logo.retake")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-12 text-gray-500 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
              >
                <ImagePlus className="h-10 w-10" />
                <span className="text-sm font-medium">{t("onboarding.logo.choose")}</span>
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setLogo(file);
                setLogoPreview(URL.createObjectURL(file));
              }}
            />
            <button
              type="button"
              disabled={submitting || !logo}
              onClick={() => void submitLogo()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("onboarding.continue")}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">{t("onboarding.name.title")}</h2>
            <p className="text-sm text-gray-600">
              {t("onboarding.name.help")}
            </p>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder={t("onboarding.name.placeholder")}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={submitting || shopName.trim().length < 1}
                onClick={() => void submitName()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("onboarding.continue")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">{t("onboarding.category.title")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    categoryId === category.id
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                      : "border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <CategoryIcon slug={category.slug} icon={category.icon} className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                      {categoryName(ct, category.name, category.slug)}
                    </p>
                  {categoryId === category.id && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check className="h-3 w-3" /> {t("onboarding.category.selected")}
                    </p>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={submitting || !categoryId}
                onClick={() => void submitCategory()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("onboarding.continue")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">{t("onboarding.location.title")}</h2>
            <button
              type="button"
              onClick={localize}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4" />
              {t("onboarding.location.useCurrent")}
            </button>
            <div className="relative overflow-hidden rounded-2xl border border-gray-200">
              <div ref={mapDivRef} className="h-72 w-full z-0" />
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 px-4 py-2.5 text-sm shadow-sm">
                {locality ? (
                  <span className="flex items-center gap-1.5 font-medium text-gray-900">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {locality}
                  </span>
                ) : (
                  <span className="text-gray-500">
                    {t("onboarding.location.tapMap")}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {t("onboarding.location.help")}
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("onboarding.location.addressLabel")}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("onboarding.location.addressPlaceholder")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={submitting || !lat || !lng}
                onClick={() => void submitLocation()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("onboarding.continue")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">{t("onboarding.payout.title")}</h2>
            <p className="text-sm text-gray-600">
              {t("onboarding.payout.description")}
            </p>
            {user?.phone && payout.account === user.phone && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {t.rich("onboarding.payout.phoneAssociated", {
                  b: (chunks) => <strong>{chunks}</strong>,
                  phone: user.phone,
                })}
              </div>
            )}
            <div className="space-y-2">
              {payoutMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPayout((p) => ({ ...p, method: method.id }))}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    payout.method === method.id
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                      : "border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${method.color} text-white text-sm font-bold`}>
                    <Coins className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{method.label}</p>
                    <p className="text-xs text-gray-600">
                      {t(payoutHintKeys[method.id])}
                    </p>
                  </div>
                  {payout.method === method.id && <Check className="h-5 w-5 text-emerald-600" />}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("onboarding.payout.accountLabel")}
              </label>
              <input
                type="tel"
                value={payout.account}
                onChange={(e) => setPayout((p) => ({ ...p, account: e.target.value }))}
                placeholder="6 XX XX XX XX"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitPayout()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("onboarding.payout.finish")}
            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}