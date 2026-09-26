"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Store,
  Share2,
  Eye,
  MousePointerClick,
  Rocket,
  BadgeCheck,
  Loader2,
  Copy as CopyIcon,
  TrendingUp,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Save,
  LocateFixed,
  Wallet,
  Package,
} from "lucide-react";
import {
  getMyShop,
  getSellerProducts,
  getSellerFinances,
  trackShopShare,
  updateShopLocation,
  SHARE_CHANNELS,
  mediaUrl,
  type MyShop as MyShopData,
  type SellerProduct,
  type SellerFinances,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { formatPrice } from "@/lib/utils";
import ShopShare from "@/components/ShopShare";
import { positionPin } from "@/lib/leafletPin";

export default function MyShopPage() {
  const t = useTranslations("seller");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading } = useApi(
    () => getMyShop(),
    [refreshKey],
    null as MyShopData | null,
  );
  const { data: products } = useApi(
    () => getSellerProducts(),
    [],
    [] as SellerProduct[],
  );
  const { data: finances } = useApi(
    () => getSellerFinances(),
    [],
    null as SellerFinances | null,
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("shop.loadError.title")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("shop.loadError.description")}
        </p>
      </div>
    );
  }

  if (!data.shop.is_onboarded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <Store className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          {t("shop.onboardingRequired.title")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("shop.onboardingRequired.description")}
        </p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Rocket className="h-4 w-4" />
          {t("shop.onboardingRequired.cta")}
        </Link>
      </div>
    );
  }

  const { shop, stats } = data;
  const channelCount = (id: string) => stats.shares_by_channel[id] ?? 0;

  const statCards = [
    { label: t("shop.stats.visitsToday"), value: stats.visits_today, icon: Eye, tint: "bg-emerald-50 text-emerald-700" },
    { label: t("shop.stats.visitsTotal"), value: stats.visits_total, icon: MousePointerClick, tint: "bg-indigo-50 text-indigo-700" },
    { label: t("shop.stats.shares"), value: stats.shares_total, icon: Share2, tint: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("shop.title")}
            </h1>
            <p className="text-gray-600">
              {t("shop.subtitle")}
            </p>
          </div>
        </div>
        <Link
          href={`/seller/${shop.slug}`}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          {t("shop.publicShop")}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {shop.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(shop.logo) ?? ""}
              alt={shop.shop_name}
              className="h-16 w-16 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600">
              <Store className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">
                {shop.shop_name}
              </h2>
              <BadgeCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-0.5 text-sm text-gray-600">
              {t("shop.trustScore", { score: shop.trust_score, max: 100 })}
              {shop.payout_method && (
                <>
                  {" • "}
                  {t("shop.payoutMethod", { method: shop.payout_method })}
                </>
              )}{" "}
              •{" "}
              <span className="flex w-fit items-center gap-1 text-emerald-700">
                <CopyIcon className="h-3.5 w-3.5" />
                /seller/{shop.slug}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tint}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900">
                  {item.value}
                </p>
                <p className="text-xs text-gray-600">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t("shop.accounting.title")}
              </h2>
              <p className="text-sm text-gray-600">
                {t("shop.accounting.description")}
              </p>
            </div>
          </div>
          <Link
            href="/seller/finances"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            {t("shop.accounting.viewAll")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-800">
              {t("shop.accounting.available")}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {finances ? formatPrice(finances.balance.available) : "…"}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-800">
              {t("shop.accounting.pending")}
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {finances ? formatPrice(finances.balance.pending) : "…"}
            </p>
          </div>
          <Link
            href="/seller/products"
            className="rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-gray-200"
          >
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Package className="h-3.5 w-3.5" />
              {t("shop.accounting.products")}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{products.length}</p>
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MapPin className="h-5 w-5 text-emerald-600" />
          {t("shop.location.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t("shop.location.description")}
        </p>

        {!shop.has_location && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              {t("shop.location.required")}
            </p>
          </div>
        )}

        <ShopLocationEditor
          location={shop.location}
          hasLocation={shop.has_location}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Share2 className="h-5 w-5 text-emerald-600" />
          {t("shop.share.title")}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {t("shop.share.description")}
        </p>
        <div className="mt-4">
          <ShopShare
            shopName={shop.shop_name}
            link={shop.share_link}
            onShare={(channel) => void trackShopShare(channel)}
          />
        </div>

        <div className="mt-6">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            {t("shop.channels.title")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SHARE_CHANNELS.map((channel) => (
              <span
                key={channel.id}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                {channel.label}
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">
                  {channelCount(channel.id)}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {t("shop.channels.tip")}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShopLocationEditor({
  location,
  hasLocation,
  onSaved,
}: {
  location: MyShopData["shop"]["location"];
  hasLocation: boolean;
  onSaved: () => void;
}) {
  const t = useTranslations("seller");
  const first = useRef(location);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    setMarker: (latNum: number, lngNum: number, zoom?: number) => void;
  } | null>(null);

  const [latText, setLatText] = useState(
    location.lat != null ? String(location.lat) : "",
  );
  const [lngText, setLngText] = useState(
    location.lng != null ? String(location.lng) : "",
  );
  const [address, setAddress] = useState(location.address ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const captured = first.current;
    let disposed = false;
    let mapInstance: import("leaflet").Map | null = null;

    void import("leaflet").then(async (L) => {
      await import("leaflet/dist/leaflet.css");
      if (disposed || !mapContainer.current) return;

      const initial: [number, number] =
        captured.lat != null && captured.lng != null ? [captured.lat, captured.lng] : [9.5, 12];
      const map = L.map(mapContainer.current, { scrollWheelZoom: false }).setView(
        initial,
        captured.lat != null ? 14 : 4,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      let marker: import("leaflet").Marker | null = null;
      const setMarker = (latNum: number, lngNum: number, zoom?: number) => {
        if (marker) marker.setLatLng([latNum, lngNum]);
        else
          marker = L.marker([latNum, lngNum], {
            icon: L.divIcon(positionPin),
          }).addTo(map);
        if (zoom != null) map.setView([latNum, lngNum], zoom);
        else map.panTo([latNum, lngNum]);
      };

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        setLatText(e.latlng.lat.toFixed(6));
        setLngText(e.latlng.lng.toFixed(6));
      });

      if (captured.lat != null && captured.lng != null) {
        setMarker(captured.lat, captured.lng);
      }

      mapInstance = map;
      leafletRef.current = { map, setMarker };
    });

    return () => {
      disposed = true;
      mapInstance?.remove();
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const latNum = Number(latText);
    const lngNum = Number(lngText);
    if (
      latText === "" ||
      lngText === "" ||
      !Number.isFinite(latNum) ||
      !Number.isFinite(lngNum)
    ) {
      return;
    }
    leafletRef.current?.setMarker(latNum, lngNum);
  }, [latText, lngText]);

  const detectLocationNow = async () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError(t("shop.locationEditor.geoUnavailable"));
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatText(pos.coords.latitude.toFixed(6));
        setLngText(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError(t("shop.locationEditor.permissionDenied"));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const saveLocation = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const latNum = Number(latText);
    const lngNum = Number(lngText);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError(t("shop.locationEditor.invalidPoint"));
      setSaving(false);
      return;
    }
    try {
      await updateShopLocation({
        location_lat: latNum,
        location_lng: lngNum,
        location_address: address.trim() ? address.trim() : null,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("shop.locationEditor.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div
        ref={mapContainer}
        className="h-64 overflow-hidden rounded-xl border border-gray-200"
      />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="font-semibold text-gray-700">
              {t("shop.locationEditor.latitude")}
            </span>
            <input
              value={latText}
              onChange={(e) => setLatText(e.target.value)}
              placeholder="14.7167"
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-gray-700">
              {t("shop.locationEditor.longitude")}
            </span>
            <input
              value={lngText}
              onChange={(e) => setLngText(e.target.value)}
              placeholder="-17.4677"
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="font-semibold text-gray-700">
            {t("shop.locationEditor.address")}
          </span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("shop.locationEditor.addressPlaceholder")}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={detectLocationNow}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {t("shop.locationEditor.locate")}
          </button>
          <button
            type="button"
            onClick={saveLocation}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("shop.locationEditor.save")}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <p className="text-sm text-emerald-600">
            {t("shop.locationEditor.saved")}
          </p>
        )}
        {!hasLocation && (
          <p className="text-xs text-gray-500">
            {t("shop.locationEditor.required")}
          </p>
        )}
      </div>
    </div>
  );
}