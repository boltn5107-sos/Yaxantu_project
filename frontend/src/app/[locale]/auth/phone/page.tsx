"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  titleKey: "buyerTitle" | "sellerTitle" | "deliveryTitle";
  descriptionKey: "buyerDescription" | "sellerDescription" | "deliveryDescription";
  icon: typeof ShoppingBag;
  color: string;
}[] = [
  {
    type: "buyer",
    titleKey: "buyerTitle",
    descriptionKey: "buyerDescription",
    icon: ShoppingBag,
    color: "bg-emerald-600",
  },
  {
    type: "seller",
    titleKey: "sellerTitle",
    descriptionKey: "sellerDescription",
    icon: Store,
    color: "bg-emerald-600",
  },
  {
    type: "delivery",
    titleKey: "deliveryTitle",
    descriptionKey: "deliveryDescription",
    icon: Bike,
    color: "bg-purple-600",
  },
];

export default function PhoneAuthPage() {
  const t = useTranslations("auth");
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
      setMessage(result.message || t("codeSent"));
      setStep("code");
      requestAnimationFrame(() => codeInputRef.current?.focus());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  const listenCode = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const text = devCode
      ? t("codeSpoken", { code: devCode.split("").join(" ... ") })
      : code.length === 6
        ? t("codeSpoken", { code: code.split("").join(" ... ") })
        : t("codeRequiredBeforeListening");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [devCode, code, t]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await verifyPhoneCode(phone, code, name.trim() || undefined);
      await refresh();
      if (user.needs_profile_choice) {
        setStep("profile");
        setMessage(t("chooseProfilePrompt"));
      } else {
        router.push(landingPathFor(user));
      }
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      setError(apiErr.errors?.code?.[0] ?? (err instanceof Error ? err.message : t("incorrectCode")));
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
      setError(err instanceof Error ? err.message : t("profileSaveError"));
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
               {t("back")}
            </button>
          )}

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Smartphone className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === "phone" && t("phoneTitle")}
              {step === "code" && t("codeTitle")}
              {step === "profile" && t("profileTitle")}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {step === "phone" && t("phoneSubtitle")}
              {step === "code" && t("codeSubtitle")}
              {step === "profile" && t("profileSubtitle")}
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
                   {t("phoneNumberLabel")}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="6 XX XX XX XX"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <PhoneBadge />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                 {t("receiveCode")}
              </button>
            </form>
          )}

          {step === "code" && (
            <form className="space-y-4" onSubmit={(e) => void verify(e)}>
              {devCode && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                   <span className="font-semibold">{t("demoMode")}</span> {t("yourCodeIs")} {" "}
                  <span className="font-mono font-bold tracking-widest">{devCode}</span>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                   {t("codeLabel")}
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <button
                type="button"
                onClick={listenCode}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
                 {t("listenCode")}
              </button>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                   {t("firstNameOptional")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                 {t("phoneSubmit")}
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
                    className="group flex w-full items-center gap-4 rounded-2xl border border-gray-200 p-4 text-left hover:border-emerald-400 hover:bg-emerald-50/60 transition-all disabled:opacity-60"
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${profile.color} text-white`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-900">
                         {t(profile.titleKey)}
                      </p>
                       <p className="text-sm text-gray-600">{t(profile.descriptionKey)}</p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </button>
                );
              })}
              <p className="pt-2 text-center text-xs text-gray-500">
                 {t("changeProfileLater")}
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