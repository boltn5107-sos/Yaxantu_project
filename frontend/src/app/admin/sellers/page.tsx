"use client";

import { useEffect, useState } from "react";
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
  { value: "", label: "Toutes les boutiques" },
  { value: "pending_verification", label: "À vérifier" },
  { value: "active", label: "Actives" },
  { value: "suspended", label: "Suspendues" },
  { value: "closed", label: "Fermées" },
];

const statusStyles: Record<string, string> = {
  pending_verification: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-gray-100 text-gray-600",
  closed: "bg-red-50 text-red-700",
};

const levelLabels: Record<number, string> = {
  0: "Non vérifiée",
  1: "Signalétique",
  2: "Identité confirmée",
  3: "Vérification renforcée",
};

export default function AdminSellersPage() {
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
        setError(err instanceof Error ? err.message : "Impossible de charger les boutiques.");
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
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handleVerify = (seller: AdminSeller) =>
    run(seller, () => verifyAdminSeller(seller.id, verifyLevel));

  const handleReject = (seller: AdminSeller) => {
    const reason = window.prompt("Motif du refus (obligatoire) :");
    if (!reason) return;
    return run(seller, () => rejectAdminSeller(seller.id, reason));
  };

  const suspendSeller = (seller: AdminSeller) => {
    if (!window.confirm(`Suspendre la boutique « ${seller.shop_name} » ?`)) return;
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
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Boutiques</h1>
        <p className="text-sm text-gray-600">
          Vérification des vendeurs, suspension, niveau de confiance et commission.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              placeholder="Nom de la boutique, propriétaire..."
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Chercher
          </button>
        </form>
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
          Aucune boutique trouvée.
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map((seller) => (
            <div key={seller.id} className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Store className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                    {seller.shop_name}
                    {seller.verification_level >= 2 && (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {seller.owner?.name ?? "—"} · {seller.owner?.email ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {seller.products_count} produits · {seller.orders_count} commandes · Score {seller.trust_score}/100
                    {seller.commission_override_bps !== null ? ` · Comm. ${(seller.commission_override_bps / 100).toFixed(1)}%` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {levelLabels[seller.verification_level] ?? "Non vérifiée"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[seller.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {seller.status === "pending_verification" ? "À vérifier" : seller.status}
                </span>
                {seller.status === "pending_verification" && (
                  <>
                    <select
                      value={verifyLevel}
                      onChange={(e) => setVerifyLevel(Number(e.target.value))}
                      title="Niveau de vérification"
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value={1}>Niveau 1</option>
                      <option value={2}>Niveau 2</option>
                      <option value={3}>Niveau 3</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy === seller.id}
                      onClick={() => void handleVerify(seller)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      {busy === seller.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Valider"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === seller.id}
                      onClick={() => void handleReject(seller)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                    >
                      Refuser
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
                    Suspendre
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
                    Réactiver
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditing({ ...seller })}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Réglages
                </button>
              </div>
            </div>
          ))}
          <AdminPagination meta={meta} onPage={setPage} />
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Réglages de « {editing.shop_name} »
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
              <select
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspendue</option>
                <option value="closed">Fermée</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Niveau de vérification</label>
              <select
                value={editing.verification_level}
                onChange={(e) => setEditing({ ...editing, verification_level: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value={0}>0 — Non vérifiée</option>
                <option value={1}>1 — Signalétique</option>
                <option value={2}>2 — Identité confirmée</option>
                <option value={3}>3 — Vérification renforcée</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Score de confiance (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editing.trust_score}
                onChange={(e) => setEditing({ ...editing, trust_score: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Commission (points de base)</label>
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
                placeholder="Aucune (défaut plateforme)"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void saveSettings()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}