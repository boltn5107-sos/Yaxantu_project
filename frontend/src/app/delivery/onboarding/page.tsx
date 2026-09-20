"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Contact,
  Camera,
  MapPin,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Clock,
  Bike,
  Footprints,
  Home,
} from "lucide-react";
import {
  getCourierOnboarding,
  courierStep1,
  courierStep,
  type CourierProgress,
} from "@/lib/api";

const stepLabels = ["Pièce d'identité", "Déplacement", "Zone", "Paiement"];

const transports = [
  { id: "foot", label: "À pied", icon: Footprints },
  { id: "moto", label: "Moto", icon: Bike },
  { id: "bike", label: "Vélo", icon: Home },
];

const payouts = [
  { id: "wave", label: "Wave", color: "bg-sky-500" },
  { id: "orange", label: "Orange Money", color: "bg-orange-500" },
  { id: "bank", label: "Banque", color: "bg-gray-700" },
];

export default function DeliveryOnboarding() {
  const router = useRouter();
  const [progress, setProgress] = useState<CourierProgress | null>(null);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [identityPhoto, setIdentityPhoto] = useState<File | null>(null);
  const [identityPreview, setIdentityPreview] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [transport, setTransport] = useState<string | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("10");
  const [payout, setPayout] = useState<{ method: string; account: string }>({
    method: "wave",
    account: "",
  });

  useEffect(() => {
    void getCourierOnboarding()
      .then((p) => {
        setProgress(p);
        if (p.is_onboarded) {
          router.replace("/delivery");
          return;
        }
        setStep(Math.min(p.current_step + 1, 4));
      })
      .catch(() => undefined);
  }, [router]);

  const next = () => {
    setStep((s) => Math.min(s + 1, 4));
    setNotice(null);
    setError(null);
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 1));
    setNotice(null);
    setError(null);
  };

  const run = async (action: () => Promise<void>, thenNext = true) => {
    setSubmitting(true);
    setError(null);
    try {
      await action();
      if (thenNext) next();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitStep1 = () =>
    run(async () => {
      if (!identityPhoto || !selfie) throw new Error("Ajoutez la pièce d'identité ET votre selfie.");
      await courierStep1({ identity_photo: identityPhoto, selfie });
      setNotice("Documents reçus, merci !");
    });

  const submitStep2 = () =>
    run(async () => {
      if (!transport) throw new Error("Choisissez votre moyen de déplacement.");
      await courierStep(2, { transport_type: transport });
      setNotice("Parfait, enregistré.");
    });

  const submitStep3 = () =>
    run(async () => {
      if (!lat || !lng) throw new Error("Choisissez votre zone de livraison.");
      await courierStep(3, {
        zone_lat: lat,
        zone_lng: lng,
        zone_radius_km: Number(radius) || 10,
      });
      setNotice("Zone enregistrée.");
    });

  const submitStep4 = () =>
    run(async () => {
      if (payout.account.trim().length < 4) throw new Error("Ajoutez le numéro pour recevoir vos courses.");
      await courierStep(4, {
        payout_method: payout.method,
        payout_account: payout.account.trim(),
      });
      router.replace("/delivery");
    }, false);

  const localize = () => {
    if (!("geolocation" in navigator)) {
      setError("Impossible de vous localiser ici. Entrez les coordonnées à la main.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setNotice("Votre zone est centrée sur votre position.");
      },
      () => setError("Impossible de connaître votre position. Entrez-la à la main."),
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white">
          <Contact className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Devenir livreur</h1>
        <p className="mt-1 text-sm text-gray-600">
          Étape {step} sur 4 — un geste à la fois.
        </p>
        <div className="mx-auto mt-6 flex max-w-md items-center gap-1.5">
          {stepLabels.map((label, index) => {
            const active = index + 1 === step;
            const reached = index + 1 < step;
            return (
              <div key={label} title={label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    active ? "bg-purple-600" : reached ? "bg-purple-400" : "bg-gray-200"
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
            <h2 className="text-lg font-semibold text-gray-900">Votre pièce d&apos;identité + un selfie</h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { key: "identity" as const, label: "Carte d'identité", icon: Contact },
                  { key: "selfie" as const, label: "Selfie (vous)", icon: Camera },
                ]
              ).map((field) => {
                const preview = field.key === "identity" ? identityPreview : selfiePreview;
                const photo = field.key === "identity" ? identityPhoto : selfie;
                return (
                  <label
                    key={field.key}
                    className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed text-center transition-colors ${
                      photo
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-300 hover:border-purple-400"
                    } ${photo ? "" : "px-4 py-10"}`}
                  >
                    {preview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt={field.label}
                          className="h-36 w-full object-cover"
                        />
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Check className="h-3 w-3" /> Reçu
                        </span>
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                          <span className="text-xs font-semibold">Toucher pour changer</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <field.icon className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{field.label}</span>
                        <span className="text-xs text-gray-500">Toucher pour choisir une photo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (field.key === "identity") {
                          setIdentityPhoto(file);
                          setIdentityPreview(URL.createObjectURL(file));
                        } else {
                          setSelfie(file);
                          setSelfiePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting || !identityPhoto || !selfie}
                onClick={() => void submitStep1()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Continuer
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Comment vous déplacez-vous ?</h2>
            <div className="grid grid-cols-3 gap-3">
              {transports.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransport(t.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-6 transition-all ${
                      transport === t.id
                        ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500/20"
                        : "border-gray-200 hover:border-purple-300"
                    }`}
                  >
                    <Icon className="h-8 w-8 text-gray-700" />
                    <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                    {transport === t.id && <Check className="h-4 w-4 text-purple-600" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={submitting || !transport}
                onClick={() => void submitStep2()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
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
            <h2 className="text-lg font-semibold text-gray-900">Votre zone de livraison</h2>
            <button
              type="button"
              onClick={localize}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4" />
              Définir ma zone à partir de ma position
            </button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Latitude</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Longitude</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Rayon de la zone (km)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={submitting || !lat || !lng}
                onClick={() => void submitStep3()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
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
            <h2 className="text-lg font-semibold text-gray-900">Où recevoir vos courses ?</h2>
            <div className="space-y-2">
              {payouts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPayout((prev) => ({ ...prev, method: p.id }))}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    payout.method === p.id
                      ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500/20"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${p.color} text-white`}>
                    <Wallet className="h-5 w-5" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-900">{p.label}</span>
                  {payout.method === p.id && <Check className="h-5 w-5 text-purple-600" />}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Numéro de paiement
              </label>
              <input
                type="tel"
                value={payout.account}
                onChange={(e) => setPayout((prev) => ({ ...prev, account: e.target.value }))}
                placeholder="6 XX XX XX XX"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitStep4()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                Envoyer ma demande
              </button>
            </div>
            <p className="text-center text-xs text-gray-500">
              Validation par SMS ou appel vocal sous {progress?.review_hours ?? 24} h.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}