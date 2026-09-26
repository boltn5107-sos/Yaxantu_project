"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Wallet, Loader2, Check, X, Send } from "lucide-react";
import {
  getAdminPayouts,
  approveAdminPayout,
  payAdminPayout,
  rejectAdminPayout,
  type AdminSellerPayout,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import AdminPagination from "@/components/admin/AdminPagination";

const statusFilter = [
  { value: "", labelKey: "payouts.allStatuses" },
  { value: "requested", labelKey: "payouts.statusRequested" },
  { value: "approved", labelKey: "payouts.statusApprovedPlural" },
  { value: "paid", labelKey: "payouts.statusPaidPlural" },
  { value: "rejected", labelKey: "payouts.statusRejectedPlural" },
];

const statusBadge: Record<string, { cls: string; labelKey: string }> = {
  requested: { cls: "bg-amber-50 text-amber-700", labelKey: "payouts.statusRequested" },
  approved: { cls: "bg-emerald-50 text-emerald-700", labelKey: "payouts.statusApproved" },
  paid: { cls: "bg-emerald-50 text-emerald-700", labelKey: "payouts.statusPaid" },
  rejected: { cls: "bg-red-50 text-red-700", labelKey: "payouts.statusRejected" },
};

const methodLabels: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
};

const methodLabelKeys: Record<string, string> = {
  bank: "payouts.methodBank",
};

export default function AdminPayoutsPage() {
  const t = useTranslations("admin");
  const [payouts, setPayouts] = useState<AdminSellerPayout[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: number; kind: "pay" | "reject" } | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAdminPayouts({ status: status || undefined, search: search || undefined, page })
      .then((result) => {
        if (cancelled) return;
        setPayouts(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("payouts.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, search, page, t]);

  const reload = () => {
    void getAdminPayouts({ status: status || undefined, search: search || undefined, page })
      .then((result) => {
        setPayouts(result.data);
        setMeta(result.meta);
      })
      .catch(() => undefined);
  };

  const run = (id: number, action: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    action()
      .then(() => {
        setEditing(null);
        setDraft("");
        reload();
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("payouts.actionError")))
      .finally(() => setBusy(null));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Wallet className="h-6 w-6 text-emerald-700" />
          {t("payouts.title")}
        </h1>
        <p className="text-sm text-gray-600">{t("payouts.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("payouts.searchPlaceholder")}
          className="w-64 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Wallet className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {t("payouts.noPayouts")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("payouts.shopHeader")}</th>
                  <th className="px-4 py-3 font-medium">{t("payouts.amountHeader")}</th>
                  <th className="px-4 py-3 font-medium">{t("payouts.methodHeader")}</th>
                  <th className="px-4 py-3 font-medium">{t("payouts.statusHeader")}</th>
                  <th className="px-4 py-3 font-medium">{t("payouts.referenceHeader")}</th>
                  <th className="px-4 py-3 font-medium">{t("payouts.requestedOnHeader")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("payouts.actionsHeader")}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((payout) => {
                const badge = statusBadge[payout.status] ?? statusBadge.requested;
                const disabled = busy !== null;
                return (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{payout.seller?.shop_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatPrice(payout.amount)}
                      <span className="ml-1 text-xs text-gray-400">{payout.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {methodLabelKeys[payout.method]
                        ? t(methodLabelKeys[payout.method])
                        : methodLabels[payout.method] ?? payout.method}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                        {t(badge.labelKey)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{payout.reference ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {payout.requested_at ? new Date(payout.requested_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {payout.status === "requested" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => run(payout.id, () => approveAdminPayout(payout.id))}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {busy === payout.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            {t("payouts.approve")}
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setEditing(
                                editing?.id === payout.id && editing.kind === "reject"
                                  ? null
                                  : { id: payout.id, kind: "reject" },
                              )
                            }
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                          >
                            {t("payouts.reject")}
                          </button>
                        </div>
                      )}
                      {payout.status === "approved" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setEditing(editing?.id === payout.id && editing.kind === "pay" ? null : { id: payout.id, kind: "pay" })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {busy === payout.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            {t("payouts.markPaid")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {editing && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t(
                    editing.kind === "pay"
                      ? "payouts.transferReferencePlaceholder"
                      : "payouts.rejectionReasonPlaceholder",
                  )}
                  className="w-full max-w-md rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      run(
                        editing.id,
                        editing.kind === "pay"
                          ? () => payAdminPayout(editing.id, draft || undefined)
                          : () => rejectAdminPayout(editing.id, draft || undefined),
                      )
                    }
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                      editing.kind === "pay" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                    } disabled:opacity-60`}
                  >
                    {busy === editing.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {editing.kind === "pay" ? "Confirmer le paiement" : "Confirmer le rejet"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Annuler
                  </button>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 px-4 py-2">
            <AdminPagination meta={meta} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}