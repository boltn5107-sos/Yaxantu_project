"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Volume2,
  ShieldCheck,
  Store,
  Bike,
  ShoppingBag,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import {
  requestPhoneCode,
  verifyPhoneCode,
  chooseProfile,
  landingPathFor,
  type ProfileType,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Step = "phone" | "code" | "profile";

const profiles: {
  type: ProfileType;
  title: string;
  description: string;
  icon: typeof ShoppingBag;
  color: string;
}[] = [
  {
    type: "buyer",
    title: "Acheteur",
    description: "Je commande et reçois mes achats",
    icon: ShoppingBag,
    color: "bg-blue-600",
  },
  {
    type: "seller",
    title: "Vendeur",
    description: "Je vends mes produits",
    icon: Store,
    color: "bg-emerald-600",
  },
  {
    type: "delivery",
    title: "Livreur",
    description: "Je livre chez les gens",
    icon: Bike,
    color: "bg-purple-600",
  },
];

export default function PhoneAuthPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  // Fonctionnalité masquée : la connexion par téléphone est indisponible,
  // on redirige vers la connexion classique.
  useEffect(() => {
    router.replace("/auth/login");
  }, [router]);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestPhoneCode(phone);
      setDevCode(result.dev_code);
      setMessage(result.message || "Code envoyé.");
      setStep("code");
      requestAnimationFrame(() => codeInputRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  const listenCode = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const text = devCode
      ? `Votre code est : ${devCode.split("").join(" ... ")}`
      : code.length === 6
        ? `Votre code est : ${code.split("").join(" ... ")}`
        : "Entrez d'abord le code reçu.";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [devCode, code]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await verifyPhoneCode(phone, code, name.trim() || undefined);
      await refresh();
      if (user.needs_profile_choice) {
        setStep("profile");
        setMessage("Bienvenue ! Qui êtes-vous ?");
      } else {
        router.push(landingPathFor(user));
      }
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      setError(apiErr.errors?.code?.[0] ?? (err instanceof Error ? err.message : "Code incorrect."));
    } finally {
      setSubmitting(false);
    }
  };

  const pickProfile = async (type: ProfileType) => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await chooseProfile(type);
      await refresh();
      router.push(landingPathFor(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le profil.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          {step !== "phone" && (
            <button
              type="button"
              onClick={() => setStep(step === "code" ? "phone" : "code")}
              className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          )}

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Smartphone className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === "phone" && "Connexion par téléphone"}
              {step === "code" && "Entrez le code"}
              {step === "profile" && "Choisissez votre profil"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {step === "phone" && "Pas d'email, pas de mot de passe. Juste votre numéro."}
              {step === "code" && "Le code a été envoyé par SMS. Vous pouvez aussi l'écouter."}
              {step === "profile" && "Touchez une carte. Vous pourrez changer plus tard."}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && step !== "profile" && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {step === "phone" && (
            <form className="space-y-4" onSubmit={(e) => void sendCode(e)}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Votre numéro de téléphone
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="6 XX XX XX XX"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <PhoneBadge />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Recevoir mon code
              </button>
            </form>
          )}

          {step === "code" && (
            <form className="space-y-4" onSubmit={(e) => void verify(e)}>
              {devCode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <span className="font-semibold">Mode démonstration :</span> votre code est{" "}
                  <span className="font-mono font-bold tracking-widest">{devCode}</span>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Code à 6 chiffres
                </label>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                type="button"
                onClick={listenCode}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
                Réécouter le code à voix haute
              </button>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Votre prénom (facultatif)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Awa"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Me connecter
              </button>
            </form>
          )}

          {step === "profile" && (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const Icon = profile.icon;
                return (
                  <button
                    key={profile.type}
                    type="button"
                    onClick={() => void pickProfile(profile.type)}
                    disabled={submitting}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left hover:border-blue-400 hover:bg-blue-50/60 transition-all disabled:opacity-60"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${profile.color} text-white`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-900">
                        {profile.title}
                      </p>
                      <p className="text-sm text-gray-600">{profile.description}</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                );
              })}
              <p className="pt-2 text-center text-xs text-gray-500">
                Vous pourrez changer de profil et en cumuler plusieurs depuis les
                paramètres.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhoneBadge() {
  return (
    <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500">
      +237
    </span>
  );
}