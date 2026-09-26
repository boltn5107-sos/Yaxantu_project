"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Truck,
  ShieldCheck,
  Smartphone,
  Loader2,
  Banknote,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import {
  getCart,
  getCheckoutConfig,
  getAddresses,
  checkout,
  estimateShipping,
  EMPTY_CART,
  type Cart,
  type Address,
  type ApiError,
  type ShippingEstimate,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { formatPrice } from "@/lib/utils";
import { positionPin } from "@/lib/leafletPin";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "MR", name: "Mauritanie" },
  { code: "NE", name: "Niger" },
  { code: "GM", name: "Gambie" },
  { code: "GW", name: "Guinée-Bissau" },
  { code: "GN", name: "Guinée" },
  { code: "SL", name: "Sierra Leone" },
  { code: "LR", name: "Liberia" },
  { code: "GH", name: "Ghana" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Bénin" },
  { code: "NG", name: "Nigeria" },
  { code: "CM", name: "Cameroun" },
  { code: "TD", name: "Tchad" },
  { code: "CF", name: "Centrafrique" },
  { code: "GA", name: "Gabon" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "République démocratique du Congo" },
  { code: "GQ", name: "Guinée équatoriale" },
  { code: "AO", name: "Angola" },
  { code: "NA", name: "Namibie" },
  { code: "BW", name: "Botswana" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "ZM", name: "Zambie" },
  { code: "MZ", name: "Mozambique" },
  { code: "MW", name: "Malawi" },
  { code: "UG", name: "Ouganda" },
  { code: "KE", name: "Kenya" },
  { code: "TZ", name: "Tanzanie" },
  { code: "RW", name: "Rwanda" },
  { code: "BI", name: "Burundi" },
  { code: "ET", name: "Éthiopie" },
  { code: "ER", name: "Érythrée" },
  { code: "DJ", name: "Djibouti" },
  { code: "SO", name: "Somalie" },
  { code: "SS", name: "Soudan du Sud" },
  { code: "SD", name: "Soudan" },
  { code: "EG", name: "Égypte" },
  { code: "LY", name: "Libye" },
  { code: "TN", name: "Tunisie" },
  { code: "DZ", name: "Algérie" },
  { code: "MA", name: "Maroc" },
  { code: "ST", name: "Sao Tomé-et-Principe" },
  { code: "CV", name: "Cap-Vert" },
  { code: "KM", name: "Comores" },
  { code: "MG", name: "Madagascar" },
  { code: "MU", name: "Maurice" },
  { code: "SC", name: "Seychelles" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "LS", name: "Lesotho" },
  { code: "SZ", name: "Eswatini" },
];

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tc = useTranslations("cart");
  const terr = useTranslations("errors");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { data: remoteCart, loading: cartLoading } = useApi(
    async () => (user ? getCart() : Promise.resolve(EMPTY_CART)),
    [user?.id],
    EMPTY_CART,
  );
  const { data: methods } = useApi(
    () => getCheckoutConfig(),
    [],
    [
      {
        id: "cod",
        label: t("methodsCodLabel"),
        description: t("methodsCodDescription"),
      },
      {
        id: "mobile_money",
        label: t("methodsMmLabel"),
        description: t("methodsMmDescription"),
      },
    ],
  );
  const { data: addresses } = useApi<Address[]>(
    async () => (user ? getAddresses() : Promise.resolve([])),
    [user?.id],
    [],
  );

  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [lastRemoteCart, setLastRemoteCart] = useState<Cart>(EMPTY_CART);

  if (remoteCart && remoteCart !== lastRemoteCart) {
    setLastRemoteCart(remoteCart);
    setCart(remoteCart);
  }

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state_province: "",
    postal_code: "",
    country_code: "SN",
    notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [provider, setProvider] = useState("momo");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [shippingApproved, setShippingApproved] = useState(false);
  const [addressId, setAddressId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locating, setLocating] = useState(false);
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "ok" | "denied" | "unavailable" | "timeout"
  >("idle");
  const [estimate, setEstimate] = useState<ShippingEstimate | null>(null);
  const [estimatingShipping, setEstimatingShipping] = useState(false);
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<{
    map: import("leaflet").Map;
    setMarker: (latNum: number, lngNum: number, zoom?: number) => void;
  } | null>(null);
  const pendingCenter = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  useEffect(() => {
    if (authLoading || cartLoading) return;
    if (!user) {
      router.push("/auth/login?next=/checkout");
    }
  }, [user, authLoading, cartLoading, router]);

  const effectiveMethod = methods.some((m) => m.id === paymentMethod)
    ? paymentMethod
    : (methods[0]?.id ?? "cod");

  // Frais de livraison estimés « à la Yango » pour l'adresse choisie.
  // null tant que la position du client n'est pas connue (aucun tarif ne peut
  // alors être affiché, au lieu d'un forfait fixe).
  const effectiveShipping = estimate?.shipping_total ?? null;

  const showForm = !authLoading && !cartLoading && cart.count > 0;

  useEffect(() => {
    if (!showForm) return;
    if (typeof window === "undefined") return;
    let disposed = false;
    let mapInstance: import("leaflet").Map | null = null;

    void import("leaflet").then(async (L) => {
      await import("leaflet/dist/leaflet.css");
      if (disposed || !mapDivRef.current) return;

      // Vue neutre par défaut (Afrique de l'Ouest). Ce n'est pas une position
      // interprétée comme celle du client : la géolocalisation, si accordée,
      // recentre ensuite le repère sur sa position réelle.
      const map = L.map(mapDivRef.current, {
        scrollWheelZoom: false,
      }).setView([14.69, -17.44], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
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
        setLat(e.latlng.lat.toFixed(6));
        setLng(e.latlng.lng.toFixed(6));
      });

      // Position déjà détectée (géolocalisation résolue avant l'import Leaflet).
      if (pendingCenter.current) {
        map.setView(
          [pendingCenter.current.lat, pendingCenter.current.lng],
          pendingCenter.current.zoom,
        );
        setMarker(pendingCenter.current.lat, pendingCenter.current.lng);
        pendingCenter.current = null;
      }

      mapInstance = map;
      leafletRef.current = { map, setMarker };
    });

    return () => {
      disposed = true;
      mapInstance?.remove();
      leafletRef.current = null;
    };
  }, [showForm]);

  useEffect(() => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (lat === "" || lng === "" || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return;
    }
    leafletRef.current?.setMarker(latNum, lngNum);
  }, [lat, lng]);

  // Centrage sur la position réelle (géolocalisation) si elle repart,
  // indexée par zoom 14 pour la suite du parcours.
  const centerOn = useCallback((latNum: number, lngNum: number, zoom = 14) => {
    if (leafletRef.current) {
      leafletRef.current.map.setView([latNum, lngNum], zoom, { animate: true });
      leafletRef.current.setMarker(latNum, lngNum);
    } else {
      pendingCenter.current = { lat: latNum, lng: lngNum, zoom };
    }
    setLat(latNum.toFixed(6));
    setLng(lngNum.toFixed(6));
  }, []);

  useEffect(() => {
    if (!showForm) return;
    if (lat !== "" || lng !== "") return;
    if (!("geolocation" in navigator)) {
      // Reporté hors du corps synchrone de l'effet : l'état initial reste
      // « idle » au premier rendu (serveur comme client), puis bascule en
      // « indisponible » après hydratation.
      const t = window.setTimeout(() => setGeoStatus("unavailable"), 0);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setGeoStatus("ok");
        centerOn(pos.coords.latitude, pos.coords.longitude, 14);
      },
      (err) => {
        if (cancelled) return;
        setGeoStatus(
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  useEffect(() => {
    if (!user || cart.count === 0) return;
    if (estimateTimer.current) clearTimeout(estimateTimer.current);

    // La position provient des coordonnées d'une adresse enregistrée, sinon de
    // la position posée sur la carte. Sans l'une des deux, aucune estimation :
    // on efface l'ancienne (dans la minuterie, hors du corps synchrone).
    const savedWithCoords =
      addressId !== "" &&
      addresses.some(
        (a) =>
          a.id === Number(addressId) &&
          a.latitude != null &&
          a.longitude != null &&
          (a.latitude !== 0 || a.longitude !== 0),
      );
    const hasPin = lat !== "" && lng !== "";

    estimateTimer.current = setTimeout(() => {
      if (!savedWithCoords && !hasPin) {
        setEstimate(null);
        return;
      }
      const payload = savedWithCoords
        ? { shipping_address_id: Number(addressId) }
        : {
            address: {
              latitude: Number(lat),
              longitude: Number(lng),
              address_line1: form.address_line1 || undefined,
              city: form.city || undefined,
            },
          };
      setEstimatingShipping(true);
      estimateShipping(payload)
        .then((data) => setEstimate(data))
        .catch(() => setEstimate(null))
        .finally(() => setEstimatingShipping(false));
    }, savedWithCoords || hasPin ? 400 : 0);

    return () => {
      if (estimateTimer.current) clearTimeout(estimateTimer.current);
    };
  }, [
    user,
    cart.count,
    addressId,
    addresses,
    lat,
    lng,
    form.address_line1,
    form.city,
  ]);

  const update =
    (key: keyof typeof form) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Tentative de détection de la position : utilisée automatiquement au
  // chargement de la page, par le bouton « Détecter ma position » et de
  // nouveau au moment de valider la commande si la position manque encore.
  const detectPositionNow = useCallback(() => {
    return new Promise<
      | { ok: true; lat: string; lng: string }
      | { ok: false; reason: "denied" | "unavailable" | "timeout" | "unsupported" }
    >((resolve) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setGeoStatus("unavailable");
        resolve({ ok: false, reason: "unsupported" });
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          setLat(lat);
          setLng(lng);
          setGeoStatus("ok");
          setLocating(false);
          resolve({ ok: true, lat, lng });
        },
        (err) => {
          const reason =
            err.code === err.PERMISSION_DENIED
              ? ("denied" as const)
              : err.code === err.TIMEOUT
                ? ("timeout" as const)
                : ("unavailable" as const);
          setGeoStatus(reason);
          setLocating(false);
          resolve({ ok: false, reason });
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }, []);

  const locateMe = async () => {
    setError(null);
    const result = await detectPositionNow();
    if (result.ok) {
      centerOn(Number(result.lat), Number(result.lng), 15);
      return;
    }
    setError(
      result.reason === "denied"
        ? t("geoDeniedShort")
        : t("geoUnavailableShort"),
    );
  };

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
      setLat(addr.latitude != null ? String(addr.latitude) : "");
      setLng(addr.longitude != null ? String(addr.longitude) : "");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    // Une adresse enregistrée n'est réellement utilisable que si elle porte
    // des coordonnées. Sinon, le formulaire (ou la position posée sur la
    // carte) fait foi, y compris pour l'estimation affichée.
    const savedAddress =
      addressId !== "" ? addresses.find((a) => a.id === Number(addressId)) : null;
    const savedWithCoords =
      savedAddress != null &&
      savedAddress.latitude != null &&
      savedAddress.longitude != null &&
      (savedAddress.latitude !== 0 || savedAddress.longitude !== 0);

    let useLat = lat;
    let useLng = lng;

    // La position est requise dès qu'un article doit être livré : on tente une
    // dernière détection automatique avant de refuser proprement.
    const needsPosition =
      cart.items.some((i) => i.requires_shipping) && !savedWithCoords;

    if (needsPosition && (useLat === "" || useLng === "")) {
      const result = await detectPositionNow();
      if (result.ok) {
        useLat = result.lat;
        useLng = result.lng;
      } else {
        setSubmitting(false);
        setError(
          result.reason === "denied"
            ? t("geoDeniedFees")
            : t("geoNoPositionFees"),
        );
        return;
      }
    }

    const addressBase = savedAddress ?? form;

    try {
      const result = await checkout({
        ...(savedWithCoords
          ? { shipping_address_id: Number(addressId) }
          : {
              address: {
                first_name: addressBase.first_name ?? undefined,
                last_name: addressBase.last_name ?? undefined,
                address_line1: addressBase.address_line1 ?? "",
                address_line2: addressBase.address_line2 ?? undefined,
                city: addressBase.city ?? "",
                state_province: addressBase.state_province ?? undefined,
                postal_code: addressBase.postal_code ?? undefined,
                country_code: addressBase.country_code ?? "SN",
                phone: addressBase.phone ?? undefined,
                latitude: useLat ? Number(useLat) : undefined,
                longitude: useLng ? Number(useLng) : undefined,
              },
            }),
        payment_method: effectiveMethod,
        ...(effectiveMethod === "mobile_money"
          ? { mobile_money_phone: mobileMoneyPhone, mobile_money_provider: provider }
          : {}),
        shipping_approved: shippingApproved,
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
        setError(terr("invalidFields"));
      } else {
        setError(apiErr instanceof Error ? apiErr.message : terr("network"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (key: string) =>
    `w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
      fieldErrors[key]
        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
        : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-500/20"
    }`;

  const fieldError = (key: string) =>
    fieldErrors[key] ? (
      <p className="mt-1 text-xs text-red-600">{fieldErrors[key][0]}</p>
    ) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-gray-600">{t("subtitle")}</p>
      </div>

      {!authLoading && !cartLoading && cart.count === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-medium text-gray-900">{tc("empty")}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
            {tc("browseProducts")}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-gray-900">{t("shippingAddress")}</h2>
              </div>

              {addresses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("useSavedAddress")}
                  </label>
                  <select
                    value={addressId}
                    onChange={(e) => applySavedAddress(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">{t("newAddress")}</option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("firstName")}</label>
                  <input value={form.first_name} onChange={update("first_name")} className={inputClass("address.first_name")} />
                  {fieldError("address.first_name")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("lastName")}</label>
                  <input value={form.last_name} onChange={update("last_name")} className={inputClass("address.last_name")} />
                  {fieldError("address.last_name")}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("phone")}</label>
                  <input value={form.phone} onChange={update("phone")} placeholder="+237 6XX XXX XXX" className={inputClass("address.phone")} />
                  {fieldError("address.phone")}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("address")} <span className="text-red-500">*</span>
                  </label>
                  <input value={form.address_line1} onChange={update("address_line1")} placeholder={t("addressPlaceholder")} className={inputClass("address.address_line1")} />
                  {fieldError("address.address_line1")}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("addressLine2")}</label>
                  <input value={form.address_line2} onChange={update("address_line2")} className={inputClass("address.address_line2")} />
                  {fieldError("address.address_line2")}
                </div>
                <div className="sm:col-span-2 rounded-xl bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={locateMe}
                    disabled={locating}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {locating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 text-emerald-700" />
                    )}
                    {t("detectPosition")}
                  </button>
                  <p className="mt-2 text-xs text-gray-500">
                    {t("shippingDistanceHint")}
                  </p>
                  <div className="mt-3 text-xs font-medium">
                    <span
                      className={
                        lat && lng ? "text-emerald-700" : "text-gray-400"
                      }
                    >
                      {lat && lng
                        ? t("position", { lat, lng })
                        : t("noPosition")}
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-gray-200">
                    <div ref={mapDivRef} className="h-64 w-full z-0" />
                    {!lat || !lng ? (
                      <div
                        className={`pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg px-3 py-2 text-xs shadow-sm flex items-center gap-2 ${
                          geoStatus === "denied" ||
                          geoStatus === "unavailable" ||
                          geoStatus === "timeout"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-white/95 text-gray-500"
                        }`}
                      >
                        {geoStatus === "denied" ||
                        geoStatus === "unavailable" ||
                        geoStatus === "timeout" ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        ) : null}
                        {geoStatus === "denied"
                          ? t("geoDenied")
                          : geoStatus === "unavailable" ||
                              geoStatus === "timeout"
                            ? t("geoNotFound")
                            : t("geoLoading")}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("city")} <span className="text-red-500">*</span>
                  </label>
                  <input value={form.city} onChange={update("city")} className={inputClass("address.city")} />
                  {fieldError("address.city")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("stateProvince")}</label>
                  <input value={form.state_province} onChange={update("state_province")} className={inputClass("address.state_province")} />
                  {fieldError("address.state_province")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("country")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.country_code}
                    onChange={update("country_code")}
                    className={inputClass("address.country_code")}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {fieldError("address.country_code")}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("postalCode")}</label>
                  <input value={form.postal_code} onChange={update("postal_code")} className={inputClass("address.postal_code")} />
                  {fieldError("address.postal_code")}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold text-gray-900">{t("payment")}</h2>
              </div>

              <div className="space-y-3">
                {methods.map((option) => {
                  const Icon = option.id === "cod" ? Banknote : Smartphone;
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        effectiveMethod === option.id ? "border-emerald-600 bg-emerald-50/50" : "border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={option.id}
                        checked={effectiveMethod === option.id}
                        onChange={() => setPaymentMethod(option.id)}
                        className="h-4 w-4 text-emerald-600"
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

              {effectiveMethod === "mobile_money" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("provider")}
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="momo">{t("providerMtn")}</option>
                      <option value="orange">{t("providerOrange")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("mobileMoneyNumber")}
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

            {effectiveShipping !== null && effectiveShipping > 0 && (
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shippingApproved}
                  onChange={(e) => setShippingApproved(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-emerald-600"
                />
                <span className="text-sm text-gray-700">
                  {t.rich("acceptShippingFees", {
                    fees: formatPrice(effectiveShipping),
                    b: (chunks) => <strong>{chunks}</strong>,
                  })}
                </span>
              </label>
            )}

            <div className="flex items-center justify-between">
              <Link href="/cart" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                {t("backToCart")}
              </Link>
              <button
                type="submit"
                disabled={
                  submitting ||
                  cart.count === 0 ||
                  (effectiveShipping !== null && effectiveShipping > 0 && !shippingApproved)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("confirm")}
              </button>
            </div>
          </div>

          <aside>
            <div className="sticky top-20 space-y-4">
              <OrderSummary
                items={cart.items.map((item) => ({
                  id: item.id,
                  quantity: item.quantity,
                  name: item.product?.name,
                  total: item.total,
                }))}
                subtotal={cart.subtotal}
                shipping={effectiveShipping}
                sellers={estimate?.sellers ?? []}
                estimating={estimatingShipping}
                note={t("noteFees")}
              />
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}