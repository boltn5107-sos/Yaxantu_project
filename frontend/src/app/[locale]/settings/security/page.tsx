"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  Fingerprint,
  Lock,
  Loader2,
  Check,
  Smartphone,
  KeyRound,
  Volume2,
  Unlock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getSettings,
  updatePin,
  verifyPin,
  securityOverview,
  biometricChallenge,
  biometricRegister,
  biometricUnlock,
  type SettingsGroups,
} from "@/lib/api";

function b64url(input: ArrayBuffer | Uint8Array): string {
  const bytes =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SecuritySettingsPage() {
  const t = useTranslations("settings");
  const { user, refresh } = useAuth();
  const [settings, setSettings] = useState<SettingsGroups | null>(null);
  const [overview, setOverview] = useState<{
    pin_configured: boolean;
    biometric_enabled: boolean;
    biometric_devices: { id: number; platform: string; created_at: string | null }[];
  } | null>(null);

  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [checkPin, setCheckPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const say = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const announce = (text: string, speak = false) => {
    setNotice(text);
    if (speak || settings?.accessibility?.voice_mode) say(text);
  };

  const load = useCallback(async () => {
    const [s, o] = await Promise.all([getSettings(), securityOverview()]);
    setSettings(s);
    setOverview(o);
  }, []);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : t("security.loadError")),
    );
  }, [load, t]);

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pin.length !== 4 || pinConfirmation !== pin) {
      setError(t("security.pinFormatError"));
      return;
    }
    setBusy("pin");
    try {
      const result = await updatePin(pin);
      setPin("");
      setPinConfirmation("");
      announce(result.message, true);
      await refresh();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("security.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const testPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("verify");
    setError(null);
    try {
      const result = await verifyPin(checkPin);
      if (result.verified) {
        setCheckPin("");
        announce(t("security.pinCorrect"), true);
      } else {
        setError(t("security.wrongPin"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("security.verifyError"));
    } finally {
      setBusy(null);
    }
  };

  const enableBiometrics = async () => {
    setError(null);
    setBusy("biometric");
    if (!overview?.pin_configured) {
      setError(t("security.pinRequiredFirst"));
      setBusy(null);
      return;
    }
    try {
      const req = await biometricChallenge();
      let raw: { ref: string; encoded: unknown };
      try {
        if (!("credentials" in navigator)) throw new Error("unsupported");
        const abortController = new AbortController();
        const created = (await navigator.credentials.create({
          publicKey: {
            rp: { name: "Taaba-taaba" },
            user: {
              id: Uint8Array.from([...new TextEncoder().encode(req.rp)].slice(0, 64)),
              name: user?.phone ?? "me",
              displayName: user?.name ?? "Moi",
            },
            challenge: (() => {
              const padded = req.challenge.padEnd(Math.ceil(req.challenge.length / 4) * 4, "=");
              const rawStr = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
              const bytes = new Uint8Array(rawStr.length);
              for (let i = 0; i < rawStr.length; i++) bytes[i] = rawStr.charCodeAt(i);
              return bytes;
            })(),
            pubKeyCredParams: [
              { alg: -7, type: "public-key" },
              { alg: -257, type: "public-key" },
            ],
            timeout: req.timeout * 1000,
            authenticatorSelection: { userVerification: "discouraged" },
            attestation: "none",
            excludeCredentials: [],
          },
          signal: abortController.signal,
        })) as PublicKeyCredential | null;
        raw = {
          ref: created?.id ?? "",
          encoded: (created as PublicKeyCredential & { toJSON?: () => unknown })?.toJSON?.() ?? {},
        };
      } catch {
        setUsingFallback(true);
        await pause(1400);
        raw = { ref: "sim-" + Date.now(), encoded: {} };
      }
      await biometricRegister({
        credential_id: raw.ref,
        public_key: typeof raw.encoded === "string" ? raw.encoded : JSON.stringify(raw.encoded),
        client_data_json: b64url(new TextEncoder().encode(JSON.stringify({ type: "webauthn.create" }))),
      });
      announce(t("security.biometricsEnabled"), true);
      await refresh();
      await load();
    } catch (err) {
      setUsingFallback(false);
      setError(err instanceof Error ? err.message : t("security.activationError"));
    } finally {
      setBusy(null);
    }
  };

  const unlockDemo = async () => {
    setError(null);
    setBusy("unlock");
    try {
      const device = overview?.biometric_devices?.[0];
      const req = await biometricChallenge(device?.id != null ? String(device.id) : undefined);
      await pause(1200);
      await biometricUnlock({
        credential_id: device ? String(device.id) : "sim-" + Date.now(),
        client_data_json: b64url(new TextEncoder().encode(JSON.stringify({ type: "webauthn.get" }))),
        authenticator_data: b64url(new Uint8Array([0x49, ...new TextEncoder().encode(req.challenge)])),
        signature: b64url(new TextEncoder().encode("demo-signature")),
      });
      announce(t("security.biometricUnlocked"), true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("security.unlockError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("security.title")}</h1>
          <p className="text-sm text-gray-600">{t("security.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{notice}</span>
          {settings?.accessibility?.voice_mode && (
            <button type="button" onClick={() => say(notice)} className="shrink-0 text-emerald-600">
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {usingFallback && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("security.fallbackMode")}
        </div>
      )}

      {!overview ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t("security.pinTitle")}</h2>
                <p className="text-xs text-gray-500">
                  {overview.pin_configured
                    ? t("security.pinConfiguredDescription")
                    : t("security.pinNewDescription")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PinInput label={t("security.pinLabel")} value={pin} onChange={setPin} />
              <PinInput
                label={t("security.pinConfirmationLabel")}
                value={pinConfirmation}
                onChange={setPinConfirmation}
              />
            </div>
            <button
              type="button"
              disabled={busy !== null || pin.length !== 4 || pinConfirmation !== pin}
              onClick={(e) => void savePin(e as React.FormEvent)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {busy === "pin" && <Loader2 className="h-4 w-4 animate-spin" />}
              {overview.pin_configured ? t("security.changePin") : t("security.savePin")}
            </button>
            {overview.pin_configured && (
              <>
                <div className="my-4 h-px bg-gray-100" />
                <form
                  onSubmit={(e) => void testPin(e)}
                  className="flex items-center gap-3"
                >
                  <PinInput
                    label={t("security.testPinLabel")}
                    value={checkPin}
                    onChange={setCheckPin}
                  />
                  <button
                    type="submit"
                    disabled={busy !== null || checkPin.length !== 4}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {busy === "verify" && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("security.verify")}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t("security.biometricsTitle")}</h2>
                <p className="text-xs text-gray-500">
                  {t("security.biometricsDescription")}
                </p>
              </div>
            </div>
            {overview.biometric_enabled ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <Check className="h-4 w-4" /> {t("security.biometricsActive")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {overview.biometric_devices.map((device) => (
                      <li key={device.id} className="inline-flex items-center gap-2 text-xs">
                        <Smartphone className="h-3.5 w-3.5" />
                        {t("security.deviceSince", {
                          platform: device.platform,
                          since: device.created_at
                            ? new Date(device.created_at).toLocaleDateString("fr-FR")
                            : t("security.today"),
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void unlockDemo()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busy === "unlock" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                    {t("security.unlockWithBiometrics")}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void enableBiometrics()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {t("security.reregisterBiometrics")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void enableBiometrics()}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy === "biometric" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("security.enableBiometrics")}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-gray-500">
            {t("security.privacy")}
          </p>
        </div>
      )}
    </div>
  );
}

function PinInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("settings");
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-lg tracking-[0.5em] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
      {value.length === 4 && (
        <span className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
          <Lock className="h-3 w-3" /> {t("security.fourDigitsEntered")}
        </span>
      )}
    </div>
  );
}