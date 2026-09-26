"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  User,
  Accessibility,
  Bell,
  CreditCard,
  ShieldCheck,
  Headphones,
  LogOut,
  Loader2,
  ChevronRight,
  Volume2,
  Camera,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  getSettings,
  updateSettings,
  uploadAvatar,
  contactHelp,
  mediaUrl,
  type SettingsGroups,
} from "@/lib/api";

type ToggleKey =
  | "voice_mode"
  | "large_text"
  | "helper_mode"
  | "notify_voice"
  | "notify_sms"
  | "notify_inapp";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { user, refresh, signOut } = useAuth();

  const [settings, setSettings] = useState<SettingsGroups | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [locale, setLocale] = useState("fr");
  const [helpMessage, setHelpMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const paymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cod: t("general.payment.cod"),
      mobile_money: t("general.payment.mobileMoney"),
      wave: t("general.payment.wave"),
      orange: t("general.payment.orange"),
      bank: t("general.payment.bank"),
    };
    return methodLabel(method, labels);
  };

  const pickAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    setError(null);
    try {
      const result = await uploadAvatar(file);
      announce(result.message);
      await refresh();
      const updated = await getSettings();
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("general.photoChangeError"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const say = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    void getSettings()
      .then((s) => {
        setSettings(s);
        setLocale(s.account.locale ?? "fr");
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("general.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const announce = (text: string, announceVoice = false) => {
    setNotice(text);
    if (announceVoice || settings?.accessibility?.voice_mode) say(text);
  };

  const patch = async (key: ToggleKey, value: boolean) => {
    if (!settings) return;
    setBusy(key);
    setError(null);
    const previous = settings;
    // Optimiste : on affiche tout de suite.
    const next: SettingsGroups = { ...settings };
    if (key.startsWith("notify_")) {
      next.notifications = { ...next.notifications, [key]: value };
    } else {
      next.accessibility = { ...next.accessibility, [key]: value };
    }
    setSettings(next);
    try {
      const result = await updateSettings({ [key]: value });
      announce(result.message, key === "voice_mode" || key === "helper_mode");
      if (key === "large_text") router.refresh();
      await refresh();
    } catch (err) {
      setSettings(previous);
      setError(err instanceof Error ? err.message : t("general.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("account");
    setError(null);
    try {
      const result = await updateSettings({ name, locale });
      announce(result.message);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("general.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const sendHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("help");
    setError(null);
    try {
      const result = await contactHelp(helpMessage);
      announce(t("general.helpRequestSent", { ticket: result.ticket }));
      setHelpMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("general.helpSendError"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-gray-600">
        {error ?? t("general.loadError")}
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-2xl px-4 sm:px-6 py-10 ${settings.accessibility.large_text ? "text-lg" : ""}`}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-white">
          <User className="h-5 w-5" />
        </div>
        <div>
         <h1 className="text-2xl font-bold text-gray-900">{t("general.title")}</h1>
         <p className="text-sm text-gray-600">{t("general.subtitle")}</p>
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
          {settings.accessibility.voice_mode && (
            <button
              type="button"
              onClick={() => say(notice)}
              className="shrink-0 text-emerald-600"
              title={t("general.replay")}
            >
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {settings.accessibility.helper_mode && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
           <p className="font-semibold">{t("general.helperModeTitle")}</p>
           <p className="mt-1">{t("general.helperModeDescription")}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Compte */}
        <Section icon={<User className="h-5 w-5" />} title={t("general.accountSection")}>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              {avatarPreview || user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview ?? mediaUrl(user?.avatar) ?? ""}
                  alt={user?.name ?? t("general.avatarAlt")}
                  className="h-16 w-16 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={busy === "avatar"}
                className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white shadow hover:bg-gray-700 disabled:opacity-50"
                aria-label={t("general.changePhoto")}
                title={t("general.changePhoto")}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void pickAvatar(e.target.files?.[0])}
            />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">{t("general.profilePhoto")}</p>
              <p>{t("general.profilePhotoDescription")}</p>
              {avatarUploading && (
                <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("general.uploading")}
                </p>
              )}
            </div>
          </div>
          <form onSubmit={(e) => void saveAccount(e)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("general.firstNameLabel")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("general.phoneLabel")}</label>
                <input
                  type="text"
                  value={user?.phone ?? ""}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("general.appLanguageLabel")}</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-gray-500 focus:outline-none"
                >
                  <option value="fr">{t("general.localeFrench")}</option>
                  <option value="en">{t("general.localeEnglish")}</option>
                  <option value="wolof">{t("general.localeWolof")}</option>
                  <option value="ewondo">{t("general.localeEwondo")}</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy === "account"}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {busy === "account" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("general.save")}
            </button>
          </form>
        </Section>

        {/* Accessibilité */}
        <Section
          icon={<Accessibility className="h-5 w-5" />}
          title={t("general.accessibility.title")}
          hint={t("general.accessibility.subtitle")}
        >
          <ToggleRow
            label={t("general.accessibility.voiceModeLabel")}
            description={t("general.accessibility.voiceModeDescription")}
            checked={settings.accessibility.voice_mode}
            disabled={busy !== null}
            onChange={(v) => void patch("voice_mode", v)}
          />
          <ToggleRow
            label={t("general.accessibility.largeTextLabel")}
            description={t("general.accessibility.largeTextDescription")}
            checked={settings.accessibility.large_text}
            disabled={busy !== null}
            onChange={(v) => void patch("large_text", v)}
          />
          <ToggleRow
            label={t("general.accessibility.helperModeLabel")}
            description={t("general.accessibility.helperModeDescription")}
            checked={settings.accessibility.helper_mode}
            disabled={busy !== null}
            onChange={(v) => void patch("helper_mode", v)}
          />
        </Section>

        {/* Notifications */}
        <Section
          icon={<Bell className="h-5 w-5" />}
          title={t("general.notifications.title")}
          hint={t("general.notifications.subtitle")}
        >
          <ToggleRow
            label={t("general.notifications.voiceLabel")}
            description={t("general.notifications.voiceDescription")}
            checked={settings.notifications.notify_voice}
            disabled={busy !== null}
            onChange={(v) => void patch("notify_voice", v)}
          />
          <ToggleRow
            label={t("general.notifications.smsLabel")}
            description={t("general.notifications.smsDescription")}
            checked={settings.notifications.notify_sms}
            disabled
            onChange={(v) => void patch("notify_sms", v)}
          />
          <ToggleRow
            label={t("general.notifications.inAppLabel")}
            description={t("general.notifications.inAppDescription")}
            checked={settings.notifications.notify_inapp}
            disabled={busy !== null}
            onChange={(v) => void patch("notify_inapp", v)}
          />
        </Section>

        {/* Paiement */}
        <Section
          icon={<CreditCard className="h-5 w-5" />}
          title={t("general.payment.title")}
          hint={t("general.payment.subtitle")}
        >
          {settings.payment_methods.linked ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <CreditCard className="h-3.5 w-3.5" />
                 {paymentMethodLabel(settings.payment_methods.payout_method ?? "")}
              </span>
              <span className="text-sm text-gray-600">
                <span className="font-medium">{settings.payment_methods.payout_account}</span>
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {t("general.payment.addMethodDescription")}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {t("general.payment.waveDescription")}
          </p>
        </Section>

        {/* Sécurité */}
        <Link href="/settings/security" className="block">
          <Section
            icon={<ShieldCheck className="h-5 w-5" />}
            title={t("general.security.title")}
            hint={t("general.security.subtitle")}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {settings.security.biometric_enabled
                    ? t("general.security.biometricEnabled")
                    : t("general.security.biometricNotYet")}
                </p>
                <p className="text-gray-600">
                  {t("general.security.pinStatus", {
                    status: settings.security.pin_configured
                      ? t("general.security.pinRecorded")
                      : t("general.security.pinNotYet"),
                  })}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Section>
        </Link>

        {/* Assistance */}
        <Section
          icon={<Headphones className="h-5 w-5" />}
          title={t("general.help.title")}
          hint={t("general.help.subtitle")}
        >
          <form onSubmit={(e) => void sendHelp(e)} className="space-y-3">
            <textarea
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              rows={3}
              placeholder={t("general.help.placeholder")}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy === "help" || helpMessage.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "help" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("general.help.send")}
            </button>
          </form>
        </Section>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {t("general.signOut")}
        </button>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function methodLabel(method: string, labels: Record<string, string>): string {
  return labels[method] ?? method;
}