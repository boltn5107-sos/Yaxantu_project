"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Store, Loader2, BadgeCheck, Settings, X, Ban, Play } from "lucide-react";
import {
  getAdminSellers,
  verifyAdminSeller,
  rejectAdminSeller,
  updateAdminSeller,
  type AdminSeller,
} from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";

const statusFilter = [
  { value: "", labelKey: "sellers.filters.allShops" },
  { value: "pending_verification", labelKey: "sellers.filters.pendingVerification" },
  { value: "active", labelKey: "sellers.filters.active" },
  { value: "suspended", labelKey: "sellers.filters.suspended" },
  { value: "closed", labelKey: "sellers.filters.closed" },
] as const;

const statusLabelKeys: Record<string, string> = {
  pending_verification: "sellers.statusLabels.pendingVerification",
  active: "sellers.statusLabels.active",
  suspended: "sellers.statusLabels.suspended",
  closed: "sellers.statusLabels.closed",
};

const statusStyles: Record<string, string> = {
  pending_verification: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-gray-100 text-gray-600",
  closed: "bg-red-50 text-red-700",
};

const levelLabelKeys: Record<number, string> = {
  0: "sellers.levels.unverified",
  1: "sellers.levels.signage",
  2: "sellers.levels.identityConfirmed",
  3: "sellers.levels.enhancedVerification",
};

export default function AdminSellersPage() {
  const t = useTranslations("admin");
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [inputSearch, setInputSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminSeller | null>(null);
  const [verifyLevel, setVerifyLevel] = useState(2);

  useEffect(() => {
    let cancelled = false;
    getAdminSellers({ search: search || undefined, status: status || undefined, page })
      .then((result) => {
        if (cancelled) return;
        setSellers(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("sellers.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, search, page, reload]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputSearch);
    setPage(1);
    setReload((n) => n + 1);
  };

  const run = async (seller: AdminSeller, action: () => Promise<string>) => {
    setBusy(seller.id);
    setError(null);
    setNotice(null);
    try {
      setNotice(await action());
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sellers.actionError"));
    } finally {
      setBusy(null);
    }
  };

  const handleVerify = (seller: AdminSeller) =>
    run(seller, () => verifyAdminSeller(seller.id, verifyLevel));

  const handleReject = (seller: AdminSeller) => {
    const reason = window.prompt(t("sellers.rejectReasonPrompt"));
    if (!reason) return;
    return run(seller, () => rejectAdminSeller(seller.id, reason));
  };

  const suspendSeller = (seller: AdminSeller) => {
    if (!window.confirm(t("sellers.suspendConfirm", { name: seller.shop_name }))) return;
    return run(seller, () => updateAdminSeller(seller.id, { status: "suspended" }));
  };

  const reactivateSeller = (seller: AdminSeller) =>
    run(seller, () => updateAdminSeller(seller.id, { status: "active" }));

  const saveSettings = async () => {
    if (!editing) return;
    setBusy(editing.id);
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await updateAdminSeller(editing.id, {
          status: editing.status as "active" | "suspended" | "closed",
          verification_level: editing.verification_level,
          trust_score: editing.trust_score,
          commission_override_bps:
            typeof editing.commission_override_bps === "number"
              ? editing.commission_override_bps
              : null,
        }),
      );
      setEditing(null);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sellers.saveError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("sellers.title")}</h1>
        <p className="text-sm text-gray-600">
          {t("sellers.subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              placeholder={t("sellers.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            {t("sellers.search")}
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          {statusFilter.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>

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
      ) : sellers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Store className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {t("sellers.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map((seller) => (
            <div key={seller.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                    {seller.shop_name}
                    {seller.verification_level >= 2 && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {seller.owner?.name ?? "—"} · {seller.owner?.email ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("sellers.summary", {
                      products: seller.products_count,
                      orders: seller.orders_count,
                      score: seller.trust_score,
                    })}
                    {seller.commission_override_bps !== null
                      ? t("sellers.commissionSummary", {
                          commission: (seller.commission_override_bps / 100).toFixed(1),
                        })
                      : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t(levelLabelKeys[seller.verification_level] ?? "sellers.levels.unverified")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[seller.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {statusLabelKeys[seller.status] ? t(statusLabelKeys[seller.status]) : seller.status}
                </span>
                {seller.status === "pending_verification" && (
                  <>
                    <select
                      value={verifyLevel}
                      onChange={(e) => setVerifyLevel(Number(e.target.value))}
                      title={t("sellers.verificationLevelTitle")}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    >
                      <option value={1}>{t("sellers.verificationLevelOption", { level: 1 })}</option>
                      <option value={2}>{t("sellers.verificationLevelOption", { level: 2 })}</option>
                      <option value={3}>{t("sellers.verificationLevelOption", { level: 3 })}</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy === seller.id}
                      onClick={() => void handleVerify(seller)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      {busy === seller.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("sellers.validate")}
                    </button>
                    <button
                      type="button"
                      disabled={busy === seller.id}
                      onClick={() => void handleReject(seller)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                    >
                      {t("sellers.reject")}
                    </button>
                  </>
                )}
                {seller.status === "active" && (
                  <button
                    type="button"
                    disabled={busy === seller.id}
                    onClick={() => void suspendSeller(seller)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {t("sellers.suspend")}
                  </button>
                )}
                {seller.status === "suspended" && (
                  <button
                    type="button"
                    disabled={busy === seller.id}
                    onClick={() => void reactivateSeller(seller)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {t("sellers.reactivate")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditing({ ...seller })}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {t("sellers.settings")}
                </button>
              </div>
            </div>
          ))}
          <AdminPagination meta={meta} onPage={setPage} />
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {t("sellers.settingsHeading", { name: editing.shop_name })}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50"
              aria-label={t("sellers.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("sellers.status")}</label>
              <select
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="active">{t("sellers.statusLabels.active")}</option>
                <option value="suspended">{t("sellers.statusLabels.suspended")}</option>
                <option value="closed">{t("sellers.statusLabels.closed")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("sellers.verificationLevel")}</label>
              <select
                value={editing.verification_level}
                onChange={(e) => setEditing({ ...editing, verification_level: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value={0}>
                  {t("sellers.verificationLevelValue", {
                    level: 0,
                    label: t("sellers.levels.unverified"),
                  })}
                </option>
                <option value={1}>
                  {t("sellers.verificationLevelValue", {
                    level: 1,
                    label: t("sellers.levels.signage"),
                  })}
                </option>
                <option value={2}>
                  {t("sellers.verificationLevelValue", {
                    level: 2,
                    label: t("sellers.levels.identityConfirmed"),
                  })}
                </option>
                <option value={3}>
                  {t("sellers.verificationLevelValue", {
                    level: 3,
                    label: t("sellers.levels.enhancedVerification"),
                  })}
                </option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("sellers.trustScore")}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editing.trust_score}
                onChange={(e) => setEditing({ ...editing, trust_score: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("sellers.commissionBps")}</label>
              <input
                type="number"
                min={0}
                max={10000}
                value={editing.commission_override_bps ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    commission_override_bps: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                placeholder={t("sellers.commissionPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t("sellers.cancel")}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void saveSettings()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("sellers.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}