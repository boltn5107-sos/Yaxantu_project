"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Megaphone,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import {
  getAdminAffiliate,
  updateAdminAffiliate,
  activateAdminAffiliate,
  approveAdminAffiliateCommission,
  reverseAdminAffiliateCommission,
  approveAdminAffiliatePayout,
  payAdminAffiliatePayout,
  rejectAdminAffiliatePayout,
  getAdminAffiliateCommissions,
  getAdminAffiliatePayouts,
  type AdminAffiliateDetail,
  type AdminAffiliateCommission,
  type AdminAffiliatePayout,
} from "@/lib/api";

const fmt = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const methodLabelKeys: Record<string, string> = {
  mobile_money: "affiliates.methodMobileMoney",
  wave: "affiliates.methodWave",
  bank: "affiliates.methodBank",
};

const statusLabelKeys: Record<string, string> = {
  draft: "affiliates.statusDraft",
  active: "affiliates.statusActive",
  suspended: "affiliates.statusSuspended",
};

export default function AdminAffiliateDetailPage() {
  const t = useTranslations("admin");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [affiliate, setAffiliate] = useState<AdminAffiliateDetail | null>(null);
  const [commissions, setCommissions] = useState<AdminAffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AdminAffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [settings, setSettings] = useState({
    public_name: "",
    commission_rate_bps: "",
    monthly_cap_minor: "",
    status: "active",
    payout_method: "",
    payout_account: "",
    payout_email: "",
    note: "",
  });

  const [activation, setActivation] = useState({
    code: "",
    discount_type: "percent",
    discount_value: "10",
    max_discount_per_order_minor: "",
    per_user_limit: "",
    max_discount_total_minor: "",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminAffiliate(id),
      getAdminAffiliateCommissions({ affiliate_id: id }),
      getAdminAffiliatePayouts({ affiliate_id: id }),
    ])
      .then(([detail, commissionsResult, payoutsResult]) => {
        if (cancelled) return;
        setAffiliate(detail);
        setCommissions(commissionsResult.data);
        setPayouts(payoutsResult.data);
        setSettings({
          public_name: detail.public_name ?? "",
          commission_rate_bps: detail.commission_rate_bps ? String(detail.commission_rate_bps) : "",
          monthly_cap_minor: detail.monthly_cap_minor ? String(detail.monthly_cap_minor) : "",
          status: detail.status === "suspended" ? "suspended" : "active",
          payout_method: detail.payout_method ?? "",
          payout_account: detail.payout_account ?? "",
          payout_email: detail.payout_email ?? "",
          note: detail.note ?? "",
        });
        setActivation({
          code: "",
          discount_type: detail.code?.discount_type ?? "percent",
          discount_value: detail.code ? String(detail.code.discount_value) : "10",
          max_discount_per_order_minor: "",
          per_user_limit: "",
          max_discount_total_minor: "",
        });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("affiliates.notFoundError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("settings");
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await updateAdminAffiliate(id, {
          public_name: settings.public_name.trim() || undefined,
          commission_rate_bps: settings.commission_rate_bps
            ? Number(settings.commission_rate_bps)
            : undefined,
          monthly_cap_minor: settings.monthly_cap_minor
            ? Number(settings.monthly_cap_minor)
            : undefined,
          status: settings.status,
          payout_method: settings.payout_method || undefined,
          payout_account: settings.payout_account.trim() || undefined,
          payout_email: settings.payout_email.trim() || undefined,
          note: settings.note.trim() || undefined,
        }),
      );
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("affiliates.updateError"));
    } finally {
      setBusy(null);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("activate");
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await activateAdminAffiliate(id, {
          code: activation.code.trim().toUpperCase() || undefined,
          discount_type: activation.discount_type as "percent" | "fixed",
          discount_value: Number(activation.discount_value),
          max_discount_per_order_minor: activation.max_discount_per_order_minor
            ? Number(activation.max_discount_per_order_minor)
            : undefined,
          per_user_limit: activation.per_user_limit ? Number(activation.per_user_limit) : undefined,
          max_discount_total_minor: activation.max_discount_total_minor
            ? Number(activation.max_discount_total_minor)
            : undefined,
        }),
      );
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("affiliates.activateError"));
    } finally {
      setBusy(null);
    }
  };

  const saveCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("code");
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await updateAdminAffiliate(id, {
          code: activation.code.trim().toUpperCase(),
          discount_type: activation.discount_type as "percent" | "fixed",
          discount_value: Number(activation.discount_value),
          max_discount_per_order_minor: activation.max_discount_per_order_minor
            ? Number(activation.max_discount_per_order_minor)
            : undefined,
          per_user_limit: activation.per_user_limit ? Number(activation.per_user_limit) : undefined,
          max_discount_total_minor: activation.max_discount_total_minor
            ? Number(activation.max_discount_total_minor)
            : undefined,
        }),
      );
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("affiliates.codeUpdateError"));
    } finally {
      setBusy(null);
    }
  };

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      setNotice(await fn());
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("affiliates.operationError"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
    );
  }

  const code = affiliate.code;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/affiliates"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("affiliates.title")}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">@{affiliate.handle}</h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              affiliate.status === "active"
                ? "bg-emerald-50 text-emerald-700"
                : affiliate.status === "draft"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
            }`}
          >
            {statusLabelKeys[affiliate.status] ? t(statusLabelKeys[affiliate.status]) : affiliate.status}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {affiliate.user?.name ?? "—"} · {affiliate.user?.email ?? "—"} ·{" "}
          {affiliate.user?.phone ?? "—"}
        </p>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Solde & performances */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("affiliates.available")}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{fmt(affiliate.balance?.amount_available ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("affiliates.pending")}</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{fmt(affiliate.balance?.amount_pending ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("affiliates.ordersGenerated")}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{affiliate.stats.orders_count}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("affiliates.cumulativeCommission")}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmt(affiliate.stats.commissions.approved)}</p>
        </div>
      </div>

      {affiliate.status === "draft" ? (
        <form
          onSubmit={handleActivate}
          className="rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            {t("affiliates.activateApplication")}
          </h2>
          {affiliate.motivation && (
            <p className="mt-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {t("affiliates.motivation", { motivation: affiliate.motivation })}
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.codeAuto")}</label>
              <input
                value={activation.code}
                onChange={(e) => setActivation({ ...activation, code: e.target.value })}
                placeholder="PYA2026"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.discountType")}</label>
              <select
                value={activation.discount_type}
                onChange={(e) => setActivation({ ...activation, discount_type: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="percent">{t("affiliates.percent")}</option>
                <option value="fixed">{t("affiliates.fixedAmount")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {activation.discount_type === "percent"
                  ? t("affiliates.discountPercent")
                  : t("affiliates.discountFixed")}
              </label>
              <input
                value={activation.discount_value}
                onChange={(e) => setActivation({ ...activation, discount_value: e.target.value })}
                type="number"
                min="1"
                max={activation.discount_type === "percent" ? 100 : undefined}
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.maxDiscountPerOrder")}</label>
              <input
                value={activation.max_discount_per_order_minor}
                onChange={(e) => setActivation({ ...activation, max_discount_per_order_minor: e.target.value })}
                type="number"
                min="0"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.maxUsesPerCustomer")}</label>
              <input
                value={activation.per_user_limit}
                onChange={(e) => setActivation({ ...activation, per_user_limit: e.target.value })}
                type="number"
                min="1"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.maxDiscountTotal")}</label>
              <input
                value={activation.max_discount_total_minor}
                onChange={(e) => setActivation({ ...activation, max_discount_total_minor: e.target.value })}
                type="number"
                min="0"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy === "activate"}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy === "activate" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("affiliates.activateAndCreateCode")}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Réglages */}
            <form onSubmit={saveSettings} className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">{t("affiliates.commissionSettings")}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t("affiliates.commissionBps")}
                  </label>
                  <input
                    value={settings.commission_rate_bps}
                    onChange={(e) => setSettings({ ...settings, commission_rate_bps: e.target.value })}
                    type="number"
                    min="0"
                    max="10000"
                    placeholder="500"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t("affiliates.monthlyCapShort")}
                  </label>
                  <input
                    value={settings.monthly_cap_minor}
                    onChange={(e) => setSettings({ ...settings, monthly_cap_minor: e.target.value })}
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.statusLabelForm")}</label>
                  <select
                    value={settings.status}
                    onChange={(e) => setSettings({ ...settings, status: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="active">{t("affiliates.statusActive")}</option>
                    <option value="suspended">{t("affiliates.statusSuspended")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.publicName")}</label>
                  <input
                    value={settings.public_name}
                    onChange={(e) => setSettings({ ...settings, public_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.payoutMethod")}</label>
                  <select
                    value={settings.payout_method}
                    onChange={(e) => setSettings({ ...settings, payout_method: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">—</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="wave">Wave</option>
                    <option value="bank">{t("affiliates.methodBank")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.payoutAccount")}</label>
                  <input
                    value={settings.payout_account}
                    onChange={(e) => setSettings({ ...settings, payout_account: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.adminNote")}</label>
                  <input
                    value={settings.note}
                    onChange={(e) => setSettings({ ...settings, note: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={busy === "settings"}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
                >
                  {busy === "settings" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("affiliates.save")}
                </button>
              </div>
            </form>

            {/* Code promo */}
            <form
              onSubmit={saveCode}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Megaphone className="h-5 w-5 text-purple-700" />
                {t("affiliates.promoCodeTitle")}
              </h2>
              {code && (
                <div className="mt-2 rounded-xl bg-purple-50 px-4 py-3 text-sm">
                  <p>
                    <code className="font-mono font-bold tracking-wide text-purple-900">{code.code}</code>
                    {" · "}
                    {code.discount_type === "percent"
                      ? `${code.discount_value} %`
                      : fmt(code.discount_value)}
                    {" · "}
                    {t("affiliates.usedTimes", {
                      count: code.used_count,
                      max: code.max_uses ? ` / ${code.max_uses}` : "",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-purple-800">
                    {t("affiliates.maxPerOrder", {
                      value: code.max_discount_per_order_minor
                        ? fmt(code.max_discount_per_order_minor)
                        : t("affiliates.unlimitedFem"),
                    })}{" "}
                    · {t("affiliates.perClient", {
                      value: code.per_user_limit ? `${code.per_user_limit}×` : t("affiliates.unlimited"),
                    })}{" "}
                    · {t("affiliates.cumulativeCap", {
                      value: code.max_discount_total_minor
                        ? fmt(code.max_discount_total_minor)
                        : t("affiliates.unlimited"),
                    })}{" "}
                    · {t("affiliates.totalGranted", { value: fmt(code.total_discount_granted_minor) })}
                  </p>
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.codeKeep")}</label>
                  <input
                    value={activation.code}
                    onChange={(e) => setActivation({ ...activation, code: e.target.value })}
                    placeholder={code?.code ?? "NOUVEAUCODE"}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.discountType")}</label>
                  <select
                    value={activation.discount_type}
                    onChange={(e) => setActivation({ ...activation, discount_type: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  >
                    <option value="percent">{t("affiliates.percent")}</option>
                    <option value="fixed">{t("affiliates.fixedAmount")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {activation.discount_type === "percent"
                  ? t("affiliates.discountPercent")
                  : t("affiliates.discountFixed")}
                  </label>
                  <input
                    value={activation.discount_value}
                    onChange={(e) => setActivation({ ...activation, discount_value: e.target.value })}
                    type="number"
                    min="1"
                    max={activation.discount_type === "percent" ? 100 : undefined}
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.maxDiscountPerOrder")}</label>
                  <input
                    value={activation.max_discount_per_order_minor}
                    onChange={(e) => setActivation({ ...activation, max_discount_per_order_minor: e.target.value })}
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.maxUsesPerCustomer")}</label>
                  <input
                    value={activation.per_user_limit}
                    onChange={(e) => setActivation({ ...activation, per_user_limit: e.target.value })}
                    type="number"
                    min="1"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("affiliates.maxDiscountTotal")}</label>
                  <input
                    value={activation.max_discount_total_minor}
                    onChange={(e) => setActivation({ ...activation, max_discount_total_minor: e.target.value })}
                    type="number"
                    min="0"
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={busy === "code"}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
                >
                  {busy === "code" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("affiliates.applyCaps")}
                </button>
              </div>
            </form>
          </div>

          {/* Commissions */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {t("affiliates.commissionsTitle", { count: commissions.length })}
              </h2>
            </div>
            {commissions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">{t("affiliates.noCommissions")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colOrder")}</th>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colBase")}</th>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colAmount")}</th>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colDate")}</th>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colStatus")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("affiliates.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-900">
                        {c.order_number ?? `#${c.id}`}
                      </td>
                      <td className="px-4 py-2 text-gray-700">{fmt(c.base_amount)}</td>
                      <td className="px-4 py-2 font-semibold text-gray-900">
                        {fmt(c.amount)}
                        <span className="ml-1 text-xs font-normal text-gray-500">({c.rate_pct} %)</span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            c.status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : c.status === "reversed"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {c.status === "approved"
                            ? t("affiliates.commissionApproved")
                            : c.status === "reversed"
                              ? t("affiliates.commissionReversed")
                              : t("affiliates.commissionPending")}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          {c.status === "pending" && (
                            <button
                              type="button"
                              disabled={busy === `c-approve-${c.id}`}
                              onClick={() =>
                                void run(
                                  `c-approve-${c.id}`,
                                  () => approveAdminAffiliateCommission(c.id),
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t("affiliates.credit")}
                            </button>
                          )}
                          {c.status !== "reversed" && (
                            <button
                              type="button"
                              disabled={busy === `c-reverse-${c.id}`}
                              onClick={() =>
                                void run(
                                  `c-reverse-${c.id}`,
                                  () => reverseAdminAffiliateCommission(c.id),
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              {t("affiliates.revoke")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Retraits */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {t("affiliates.payoutsTitle", { count: payouts.length })}
              </h2>
            </div>
            {payouts.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">{t("affiliates.noPayouts")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colRequestedOn")}</th>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colAmount")}</th>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colMethod")}</th>
                    <th className="px-4 py-2 font-medium">{t("affiliates.colStatus")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("affiliates.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {p.requested_at ? new Date(p.requested_at).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-2 font-semibold text-gray-900">{fmt(p.amount)}</td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {methodLabelKeys[p.method] ? t(methodLabelKeys[p.method]) : p.method}
                        {p.account ? ` · ${p.account}` : ""}
                        {p.reference || p.note ? (
                          <span className="block text-xs text-gray-400">
                            {p.reference ? t("affiliates.reference", { ref: p.reference }) : ""}
                            {p.note ? p.note : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            p.status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : p.status === "rejected"
                                ? "bg-red-50 text-red-700"
                                : p.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {p.status === "paid"
                            ? t("affiliates.payoutStatusPaid")
                            : p.status === "rejected"
                              ? t("affiliates.payoutStatusRejected")
                              : p.status === "approved"
                                ? t("affiliates.payoutStatusApproved")
                                : t("affiliates.payoutStatusPending")}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2">
                          {p.status === "requested" && (
                            <>
                              <button
                                type="button"
                                disabled={busy === `p-approve-${p.id}`}
                                onClick={() =>
                                  void run(`p-approve-${p.id}`, () => approveAdminAffiliatePayout(p.id))
                                }
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                              >
                                {t("affiliates.approve")}
                              </button>
                              <button
                                type="button"
                                disabled={busy === `p-reject-${p.id}`}
                                onClick={() => {
                                  const reason = window.prompt(t("affiliates.rejectPrompt"));
                                  if (reason === null) return;
                                  void run(`p-reject-${p.id}`, () => rejectAdminAffiliatePayout(p.id, reason || undefined));
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {t("affiliates.reject")}
                              </button>
                            </>
                          )}
                          {(p.status === "approved" || p.status === "requested") && (
                            <button
                              type="button"
                              disabled={busy === `p-pay-${p.id}`}
                              onClick={() => {
                                const reference = window.prompt(t("affiliates.paymentRefPrompt")) ?? "";
                                void run(`p-pay-${p.id}`, () => payAdminAffiliatePayout(p.id, reference || undefined));
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {t("affiliates.markPaid")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}