"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSettings, updateSettings, contactHelp, type SettingsGroups } from "@/lib/api";

type ToggleKey =
  | "voice_mode"
  | "large_text"
  | "helper_mode"
  | "notify_voice"
  | "notify_sms"
  | "notify_inapp";

export default function SettingsPage() {
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
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les paramètres."))
      .finally(() => setLoading(false));
  }, []);

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
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
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
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
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
      announce(`Demande envoyée. Numéro : ${result.ticket}`);
      setHelpMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
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
        {error ?? "Impossible de charger les paramètres."}
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
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-600">Tout se règle ici, en quelques gestes.</p>
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
            <button type="button" onClick={() => say(notice)} className="shrink-0 text-emerald-600" title="Réécouter">
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {settings.accessibility.helper_mode && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold">Mode « Aide-moi » actif</p>
          <p className="mt-1">
            Une personne de l&apos;équipe Yaxantu peut vous accompagner. Touchez Assistance pour
            l&apos;appeler.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Compte */}
        <Section icon={<User className="h-5 w-5" />} title="Compte">
          <form onSubmit={(e) => void saveAccount(e)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Votre prénom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
                <input
                  type="text"
                  value={user?.phone ?? ""}
                  disabled
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Langue de l&apos;app</label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-gray-500 focus:outline-none"
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="wolof">Wolof</option>
                  <option value="ewondo">Ewondo</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy === "account"}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {busy === "account" && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </button>
          </form>
        </Section>

        {/* Accessibilité */}
        <Section
          icon={<Accessibility className="h-5 w-5" />}
          title="Accessibilité"
          hint="Mieux voir et entendre"
        >
          <ToggleRow
            label="Tout à voix haute (100 % vocal)"
            description="Votre app vous lit les messages, les codes et les montants."
            checked={settings.accessibility.voice_mode}
            disabled={busy !== null}
            onChange={(v) => void patch("voice_mode", v)}
          />
          <ToggleRow
            label="Grands textes"
            description="Tous les textes sont agrandis."
            checked={settings.accessibility.large_text}
            disabled={busy !== null}
            onChange={(v) => void patch("large_text", v)}
          />
          <ToggleRow
            label="Aide-moi"
            description="Active l'accompagnement par une personne réelle."
            checked={settings.accessibility.helper_mode}
            disabled={busy !== null}
            onChange={(v) => void patch("helper_mode", v)}
          />
        </Section>

        {/* Notifications */}
        <Section icon={<Bell className="h-5 w-5" />} title="Notifications" hint="Comment on vous prévient">
          <ToggleRow
            label="À voix haute"
            description="Une voix vous annonce les nouvelles commandes."
            checked={settings.notifications.notify_voice}
            disabled={busy !== null}
            onChange={(v) => void patch("notify_voice", v)}
          />
          <ToggleRow
            label="Par SMS"
            description="Un message SMS quand vous avez une commande."
            checked={settings.notifications.notify_sms}
            disabled={busy !== null}
            onChange={(v) => void patch("notify_sms", v)}
          />
          <ToggleRow
            label="Dans l'app"
            description="Une notification dans l'application."
            checked={settings.notifications.notify_inapp}
            disabled={busy !== null}
            onChange={(v) => void patch("notify_inapp", v)}
          />
        </Section>

        {/* Paiement */}
        <Section icon={<CreditCard className="h-5 w-5" />} title="Paiement" hint="Vos moyens de paiement">
          {settings.payment_methods.linked ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <CreditCard className="h-3.5 w-3.5" />
                {methodLabel(settings.payment_methods.payout_method ?? "")}
              </span>
              <span className="text-sm text-gray-600">
                <span className="font-medium">{settings.payment_methods.payout_account}</span>
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Ajoutez un moyen de paiement pour recevoir vos ventes (depuis l&apos;espace
              vendeur).
            </p>
          )}
          <p className="text-xs text-gray-500">
            Wave sert à payer vos achats et à recevoir vos ventes. Tout est transparent.
          </p>
        </Section>

        {/* Sécurité */}
        <Link href="/settings/security" className="block">
          <Section icon={<ShieldCheck className="h-5 w-5" />} title="Sécurité" hint="Verrouiller sur votre téléphone">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {settings.security.biometric_enabled
                    ? "Empreinte / visage : activé"
                    : "Empreinte / visage : pas encore"}
                </p>
                <p className="text-gray-600">
                  Code PIN : {settings.security.pin_configured ? "enregistré" : "pas encore"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </Section>
        </Link>

        {/* Assistance */}
        <Section icon={<Headphones className="h-5 w-5" />} title="Assistance" hint="Une vraie personne vous répond">
          <form onSubmit={(e) => void sendHelp(e)} className="space-y-3">
            <textarea
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              rows={3}
              placeholder="Décrivez votre besoin en quelques mots..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy === "help" || helpMessage.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === "help" && <Loader2 className="h-4 w-4 animate-spin" />}
              Envoyer ma demande
            </button>
          </form>
        </Section>

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
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

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    cod: "Paiement à la livraison",
    mobile_money: "Mobile Money (MTN / Orange)",
    wave: "Wave",
    orange: "Orange Money",
    bank: "Compte bancaire",
  };
  return labels[method] ?? method;
}