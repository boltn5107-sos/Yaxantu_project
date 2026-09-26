"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Banknote, BadgePercent, Loader2, Settings as SettingsIcon } from "lucide-react";
import {
  getAdminCheckoutConfig,
  updateAdminCheckoutConfig,
  type CheckoutConfigSettings,
} from "@/lib/api";

export default function AdminSettingsPage() {
  const t = useTranslations("admin");
  const [config, setConfig] = useState<CheckoutConfigSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminCheckoutConfig()
      .then((result) => {
        if (cancelled) return;
        setConfig(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("settings.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const toggle = async (key: keyof CheckoutConfigSettings) => {
    if (!config) return;
    const next = { ...config, [key]: !config[key] };
    setSaving(key);
    setError(null);
    setNotice(null);
    try {
      const saved = await updateAdminCheckoutConfig({ [key]: next[key] });
      setConfig(saved);
      setNotice(t("settings.saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.updateError"));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-emerald-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("settings.title")}</h1>
          <p className="mt-0.5 text-sm text-gray-600">{t("settings.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t("settings.paymentCod.title")}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {t("settings.paymentCod.description")}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!config?.cod_enabled}
              onClick={() => void toggle("cod_enabled")}
              disabled={saving === "cod_enabled"}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60 ${
                config?.cod_enabled ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  config?.cod_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <BadgePercent className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t("settings.promoCodes.title")}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {t("settings.promoCodes.description")}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!config?.promo_codes_enabled}
              onClick={() => void toggle("promo_codes_enabled")}
              disabled={saving === "promo_codes_enabled"}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60 ${
                config?.promo_codes_enabled ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  config?.promo_codes_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}