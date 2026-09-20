"use client";

import { useEffect, useState } from "react";
import { Loader2, Scale, MessageSquare, X } from "lucide-react";
import {
  getAdminDisputes,
  getAdminDispute,
  resolveAdminDispute,
  type AdminDispute,
  type AdminDisputeDetail,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import AdminPagination from "@/components/admin/AdminPagination";

const statusFilter = [
  { value: "", label: "Tous les statuts" },
  { value: "open", label: "Ouverts" },
  { value: "moderating", label: "En médiation" },
  { value: "resolved", label: "Résolus" },
];

const statusBadge: Record<string, { cls: string; label: string }> = {
  open: { cls: "bg-red-50 text-red-700", label: "Ouvert" },
  moderating: { cls: "bg-amber-50 text-amber-700", label: "En médiation" },
  resolved: { cls: "bg-emerald-50 text-emerald-700", label: "Résolu" },
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<AdminDisputeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [action, setAction] = useState<"no_refund" | "refund_full" | "refund_partial">("refund_full");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminDisputes({ status: status || undefined, search: search || undefined, page })
      .then((result) => {
        if (cancelled) return;
        setDisputes(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les litiges.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, search, page]);

  const openDetail = (id: number) => {
    setLoadingDetail(true);
    setActionError(null);
    getAdminDispute(id)
      .then((d) => {
        setDetail(d);
        setAction("refund_full");
        setAmount("");
        setNote("");
      })
      .catch((err) => setActionError(err instanceof Error ? err.message : "Impossible de charger le litige."))
      .finally(() => setLoadingDetail(false));
  };

  const resolve = () => {
    if (!detail) return;
    setResolving(true);
    setActionError(null);
    const amountMinor = action === "refund_partial" ? Math.round(Number(amount)) : undefined;
    resolveAdminDispute(detail.id, {
      action,
      amount_minor: amountMinor,
      note: note || undefined,
    })
      .then(() => {
        setDetail(null);
        getAdminDisputes({ status: status || undefined, search: search || undefined, page })
          .then((result) => {
            setDisputes(result.data);
            setMeta(result.meta);
          })
          .catch(() => undefined);
      })
      .catch((err) => setActionError(err instanceof Error ? err.message : "Résolution impossible."))
      .finally(() => setResolving(false));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Scale className="h-6 w-6 text-blue-700" />
          Médiation des litiges
        </h1>
        <p className="text-sm text-gray-600">
          Consulter les réclamations, suivre les échanges et arbitrer (remboursement total ou partiel, ou rejet).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {statusFilter.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Commande, titre, boutique..."
          className="w-64 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Scale className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          Aucun litige trouvé.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Litige</th>
                <th className="px-4 py-3 font-medium">Acheteur</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Commande</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {disputes.map((dispute) => {
                const badge = statusBadge[dispute.status] ?? statusBadge.open;
                return (
                  <tr key={dispute.id} onClick={() => void openDetail(dispute.id)} className="cursor-pointer hover:bg-blue-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{dispute.title}</p>
                      <p className="text-xs text-gray-500">{formatPrice(dispute.order_total)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{dispute.buyer ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{dispute.shop ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{dispute.order_number ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{dispute.messages_count}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {dispute.created_at ? new Date(dispute.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2">
            <AdminPagination meta={meta} onPage={setPage} />
          </div>
        </div>
      )}

      {loadingDetail && (
        <div className="flex justify-center py-10 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {detail && !loadingDetail && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{detail.title}</h2>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  (statusBadge[detail.status] ?? statusBadge.open).cls
                }`}>
                  {(statusBadge[detail.status] ?? statusBadge.open).label}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{detail.description ?? "Aucune description."}</p>
            </div>
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">Acheteur</p>
              <p className="mt-1 text-gray-700">{detail.buyer?.name ?? "—"}</p>
              {detail.buyer?.email && <p className="text-xs text-gray-500">{detail.buyer.email}</p>}
              {detail.buyer?.phone && <p className="text-xs text-gray-500">{detail.buyer.phone}</p>}
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">Boutique</p>
              <p className="mt-1 text-gray-700">{detail.shop ?? "—"}</p>
              {detail.order && (
                <>
                  <p className="mt-1 text-xs text-gray-500">
                    Commande {detail.order.order_number} · {formatPrice(detail.order.total)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Paiement : {detail.order.payment_status} · {detail.order.status_label}
                  </p>
                </>
              )}
            </div>
          </div>

          {detail.photo && (
            <img src={detail.photo} alt="" className="mt-4 max-h-60 rounded-xl border border-gray-200" />
          )}

          <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <MessageSquare className="h-4 w-4 text-blue-700" />
            Échanges ({detail.messages.length})
          </h3>
          <div className="mt-3 space-y-3">
            {detail.messages.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun message envoyé pour le moment.</p>
            ) : (
              detail.messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-gray-100 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">{message.by ?? "Membre"}</span>
                    {message.created_at
                      ? new Date(message.created_at).toLocaleString("fr-FR")
                      : ""}
                  </div>
                  {message.text && <p className="mt-1 text-sm text-gray-700">{message.text}</p>}
                  {message.photo && <img src={message.photo} alt="" className="mt-2 max-h-40 rounded-lg border border-gray-200" />}
                </div>
              ))
            )}
          </div>

          {actionError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
          )}

          {detail.status !== "resolved" ? (
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Résolution</h3>
              <div className="mt-3 grid gap-3">
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as typeof action)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="refund_full">Remboursement intégral ({formatPrice(detail.order?.total ?? 0)})</option>
                  <option value="refund_partial">Remboursement partiel</option>
                  <option value="no_refund">Arbitrage sans remboursement</option>
                </select>
                {action === "refund_partial" && (
                  <input
                    type="number"
                    min={0}
                    max={detail.order?.total ?? 0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Montant en FCFA"
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                )}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Note interne (optionnelle)"
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={resolving}
                    onClick={resolve}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {resolving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Résoudre le litige
                  </button>
                  {detail.order && (
                    <span className="text-xs text-gray-500">
                      Montant max disponible : {formatPrice(detail.order.total)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            detail.resolution && (
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">Litige résolu</p>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">
                  {JSON.stringify(detail.resolution, null, 2)}
                </pre>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}