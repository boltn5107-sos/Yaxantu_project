"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ImagePlus,
  Mic,
  PackageCheck,
  MapPin,
  Coins,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Store,
  Sparkles,
} from "lucide-react";
import {
  getSellerOnboarding,
  sellerStep1,
  sellerStep,
  sponsorSeller,
  getCategories,
  type Category,
  type SellerOnboardingProgress,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const stepLabels = ["Logo", "Nom", "Catégorie", "Position", "Paiement"];

const payoutMethods = [
  {
    id: "wave",
    label: "Wave",
    hint: "Recevez directement sur Wave",
    color: "bg-sky-500",
  },
  {
    id: "orange",
    label: "Orange Money",
    hint: "Recevez sur Orange Money",
    color: "bg-orange-500",
  },
  {
    id: "bank",
    label: "Compte bancaire",
    hint: "Virement bancaire",
    color: "bg-gray-700",
  },
];

export default function SellerOnboarding() {
  const { user, refresh } = useAuth();

  const [progress, setProgress] = useState<SellerOnboardingProgress | null>(null);
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
  const [sponsorPhone, setSponsorPhone] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getSellerOnboarding()
      .then((p) => {
        setProgress(p);
        if (p.is_onboarded) setDone(true);
        else setStep(Math.min(p.current_step + 1, 5));
      })
      .catch(() => undefined);
    void getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

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
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitLogo = () =>
    run(async () => {
      if (!logo) throw new Error("Ajoutez une photo du logo de votre boutique.");
      const result = await sellerStep1(logo);
      setNotice("Logo reçu. Très bien !");
      setProgress((p) => p && { ...p, current_step: result.data.current_step, is_onboarded: result.data.is_onboarded });
      next();
    });

  const submitName = () =>
    run(async () => {
      if (shopName.trim().length < 1) throw new Error("Dites ou écrivez le nom de votre boutique.");
      const result = await sellerStep(2, { shop_name: shopName.trim() });
      setNotice(`« ${shopName.trim()} » c'est enregistré.`);
      setProgress((p) => p && { ...p, current_step: result.data.current_step, is_onboarded: result.data.is_onboarded });
      next();
    });

  const submitCategory = () =>
    run(async () => {
      if (!categoryId) throw new Error("Choisissez une catégorie.");
      const result = await sellerStep(3, { main_category_id: categoryId });
      setNotice("Catégorie enregistrée.");
      setProgress((p) => p && { ...p, current_step: result.data.current_step, is_onboarded: result.data.is_onboarded });
      next();
    });

  const submitLocation = () =>
    run(async () => {
      if (!lat || !lng) throw new Error("Choisissez la position de votre boutique.");
      const result = await sellerStep(4, {
        location_lat: lat,
        location_lng: lng,
        location_address: address || null,
      });
      setProgress((p) => p && { ...p, current_step: result.data.current_step, is_onboarded: result.data.is_onboarded });
      next();
    });

  const submitPayout = () =>
    run(async () => {
      if (payout.account.trim().length < 4) throw new Error("Ajoutez le numéro pour recevoir votre argent.");
      const result = await sellerStep(5, {
        payout_method: payout.method,
        payout_account: payout.account.trim(),
      });
      setProgress((p) => p && { ...p, current_step: result.data.current_step, is_onboarded: result.data.is_onboarded });
      await refresh();
      setDone(true);
    });

  const submitSponsor = () =>
    run(async () => {
      const result = await sponsorSeller(sponsorPhone);
      setNotice(`Parrainage pris en compte (${result.sponsor.shop_name}).`);
      setSponsorPhone("");
    });

  const localize = () => {
    if (!("geolocation" in navigator)) {
      setError("Votre appareil ne permet pas la localisation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setNotice("Position de la boutique enregistrée sur la carte.");
      },
      () => setError("Impossible de connaître votre position. Entrez-la à la main."),
    );
  };

  const dictate = () => {
    if (!("webkitSpeechRecognition" in window)) {
      setNotice("La dictée vocale n'est pas disponible ici. Écrivez le nom.");
      return;
    }
    const SpeechRecognition =
      (window as unknown as { webkitSpeechRecognition: new () => { lang: string; onresult: (e: unknown) => void; start: () => void } })
        .webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "fr-FR";
    rec.onresult = (e: unknown) => {
      const transcript = (e as { results: { 0: { 0: { transcript: string } } } }).results[0][0].transcript;
      setShopName(transcript.trim());
    };
    rec.start();
  };

  if (done) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Votre boutique est créée !</h1>
          <p className="mt-2 text-sm text-gray-600">
            Vous êtes officiellement vendeur sur Yaxantu. Ajoutez votre premier
            produit pour commencer à vendre.
          </p>
          {progress && (
            <p className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              Confiance de départ : {progress.trust_score}/100
            </p>
          )}
          <div className="mt-6 grid gap-3">
            <Link
              href="/seller/orders"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <PackageCheck className="h-4 w-4" />
              Voir mes commandes
            </Link>
            <Link
              href="/seller/finances"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Comptes et retraits
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
        <h1 className="text-2xl font-bold text-gray-900">Créer ma boutique</h1>
        <p className="mt-1 text-sm text-gray-600">
          Étape {step} sur 5 — un geste à la fois.
        </p>
        <div className="mx-auto mt-6 flex max-w-md items-center gap-1.5">
          {stepLabels.map((label, index) => {
            const active = index + 1 === step;
            const reached = index + 1 < step;
            return (
              <div key={label} title={label} className="flex-1">
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
          {stepLabels[step - 1]}
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
            <h2 className="text-lg font-semibold text-gray-900">Photo du logo de votre boutique</h2>
            {logoPreview ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Logo"
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
                    Reprendre la photo
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
                <span className="text-sm font-medium">Prendre une photo ou choisir une image</span>
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
              Continuer
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Le nom de votre boutique</h2>
            <p className="text-sm text-gray-600">
              Dites-le à voix haute ou écrivez-le. Exemple : « Chez Awa ».
            </p>
            <div className="relative">
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Nom de ma boutique"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={dictate}
                disabled={submitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                title="Dicter à voix haute"
              >
                <Mic className="h-3.5 w-3.5" />
                Dicter
              </button>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Un vendeur actif vous parraine ?</p>
              <p className="mt-1 text-xs">
                Son numéro augmente votre niveau de confiance de départ. (Facultatif)
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="tel"
                  value={sponsorPhone}
                  onChange={(e) => setSponsorPhone(e.target.value)}
                  placeholder="6 XX XX XX XX"
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none"
                />
                <button
                  type="button"
                  disabled={submitting || sponsorPhone.trim().length < 8}
                  onClick={() => void submitSponsor()}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  Valider
                </button>
              </div>
            </div>
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
                Continuer
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Que vendez-vous ?</h2>
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
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-2xl">
                    {category.icon ?? "🛍️"}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{category.name}</p>
                  {categoryId === category.id && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check className="h-3 w-3" /> Choisi
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
                Continuer
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Où se trouve votre boutique ?</h2>
            <button
              type="button"
              onClick={localize}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4" />
              Utiliser ma position actuelle
            </button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Latitude</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="4.0511"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Longitude</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="9.7679"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Adresse (facultatif)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Quartier, ville"
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
                Continuer
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Où recevoir votre argent ?</h2>
            <p className="text-sm text-gray-600">
              Vos ventes seront reversées ici, sans frais avant la première vente.
            </p>
            {user?.phone && payout.account === user.phone && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Votre numéro{" "}
                <span className="font-bold">{user.phone}</span> est déjà
                associé à votre compte — vous recevrez vos ventes dessus.
                Touchez continuer pour confirmer.
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
                    <p className="text-xs text-gray-600">{method.hint}</p>
                  </div>
                  {payout.method === method.id && <Check className="h-5 w-5 text-emerald-600" />}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Numéro pour recevoir l&apos;argent
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
                Terminer la création
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}