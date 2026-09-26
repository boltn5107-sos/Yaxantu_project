"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, BadgePercent, Trash2 } from "lucide-react";
import {
  getAdminPromoCodes,
  createAdminPromoCode,
  updateAdminPromoCode,
  deleteAdminPromoCode,
  type AdminPromoCode,
} from "@/lib/api";

const emptyForm = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  min_order_minor: "",
  max_uses: "",
  one_time: false,
  starts_at: "",
  expires_at: "",
  is_active: true,
};

export default function AdminPromoCodesPage() {
  const t = useTranslations("admin");
  const [codes, setCodes] = useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    let cancelled = false;
    getAdminPromoCodes()
      .then((result) => {
        if (cancelled) return;
        setCodes(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("promoCodes.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const toggleActive = async (code: AdminPromoCode) => {
    setBusy(`active-${code.id}`);
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await updateAdminPromoCode(code.id, {
          code: code.code,
          discount_type: code.discount_type,
          discount_value: code.discount_value,
          min_order_minor: code.min_order_minor ?? undefined,
          max_uses: code.max_uses ?? undefined,
          one_time: code.one_time,
          is_active: !code.is_active,
          starts_at: code.starts_at ?? undefined,
          expires_at: code.expires_at ?? undefined,
        }),
      );
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("promoCodes.updateError"));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (code: AdminPromoCode) => {
    if (!window.confirm(t("promoCodes.deleteConfirm", { code: code.code }))) return;
    setBusy(`delete-${code.id}`);
    setError(null);
    setNotice(null);
    try {
      setNotice(await deleteAdminPromoCode(code.id));
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("promoCodes.deleteError"));
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) return;
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await createAdminPromoCode({
          code: form.code.trim().toUpperCase(),
          discount_type: form.discount_type as "percent" | "fixed",
          discount_value: Number(form.discount_value),
          min_order_minor: form.min_order_minor ? Number(form.min_order_minor) : undefined,
          max_uses: form.max_uses ? Number(form.max_uses) : undefined,
          one_time: form.one_time,
          is_active: form.is_active,
          starts_at: form.starts_at || undefined,
          expires_at: form.expires_at || undefined,
        }),
      );
      setForm({ ...emptyForm });
      setShowForm(false);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("promoCodes.createError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("promoCodes.title")}</h1>
          <p className="text-sm text-gray-600">{t("promoCodes.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          {t("promoCodes.new")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("promoCodes.codeLabel")}</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
              placeholder="PROMO2026"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("promoCodes.typeLabel")}</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="percent">{t("promoCodes.typePercent")}</option>
              <option value="fixed">{t("promoCodes.typeFixed")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("promoCodes.valueLabel")} *{" "}
              {form.discount_type === "percent"
                ? t("promoCodes.valuePercent")
                : t("promoCodes.valueFcfa")}
            </label>
            <input
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              required
              type="number"
              min="1"
              max={form.discount_type === "percent" ? 100 : undefined}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("promoCodes.minOrderLabel")}</label>
            <input
              value={form.min_order_minor}
              onChange={(e) => setForm({ ...form, min_order_minor: e.target.value })}
              type="number"
              min="0"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("promoCodes.maxUsesLabel")}</label>
            <input
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              type="number"
              min="1"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("promoCodes.startsLabel")}</label>
            <input
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              type="datetime-local"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("promoCodes.expiresLabel")}</label>
            <input
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              type="datetime-local"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                {t("promoCodes.activeNow")}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.one_time}
                  onChange={(e) => setForm({ ...form, one_time: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                {t("promoCodes.oneTimePerClient")}
              </label>
            </div>
            <button
              type="submit"
              disabled={busy === "create"}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "create" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("promoCodes.create")}
            </button>
          </div>
        </form>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <BadgePercent className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {t("promoCodes.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("promoCodes.code")}</th>
                <th className="px-4 py-3 font-medium">{t("promoCodes.discount")}</th>
                <th className="px-4 py-3 font-medium">{t("promoCodes.minOrder")}</th>
                <th className="px-4 py-3 font-medium">{t("promoCodes.validity")}</th>
                <th className="px-4 py-3 font-medium">{t("promoCodes.uses")}</th>
                <th className="px-4 py-3 font-medium">{t("promoCodes.status")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("promoCodes.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-gray-900">{code.code}</p>
                    {code.one_time && <p className="text-xs text-gray-500">{t("promoCodes.oneTimeBadge")}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {code.discount_type === "percent" ? `${code.discount_value} %` : `${code.discount_value} FCFA`}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{code.min_order_minor ? `${code.min_order_minor} FCFA` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {code.starts_at ? new Date(code.starts_at).toLocaleDateString("fr-FR") : t("promoCodes.startsNow")}
                    {" → "}
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString("fr-FR") : t("promoCodes.never")}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {code.used_count}
                    {code.max_uses ? ` / ${code.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      code.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {code.is_active ? t("promoCodes.statusActive") : t("promoCodes.statusInactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy === `active-${code.id}`}
                        onClick={() => void toggleActive(code)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      >
                        {code.is_active ? t("promoCodes.deactivate") : t("promoCodes.activate")}
                      </button>
                      <button
                        type="button"
                        disabled={busy === `delete-${code.id}`}
                        onClick={() => void handleDelete(code)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("promoCodes.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}