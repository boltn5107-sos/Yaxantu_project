"use client";

import { useEffect, useState } from "react";
import { Search, Store, Loader2, BadgeCheck } from "lucide-react";
import {
  getAdminSellers,
  verifyAdminSeller,
  rejectAdminSeller,
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

  const handleVerify = async (seller: AdminSeller) => {
    setBusy(seller.id);
    setError(null);
    setNotice(null);
    try {
      setNotice(await verifyAdminSeller(seller.id));
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vérification impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (seller: AdminSeller) => {
    const reason = window.prompt("Motif du refus (obligatoire) :");
    if (!reason) return;
    setBusy(seller.id);
    setError(null);
    setNotice(null);
    try {
      setNotice(await rejectAdminSeller(seller.id, reason));
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refus impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Boutiques</h1>
        <p className="text-sm text-gray-600">Vérification des vendeurs et pilotage des boutiques.</p>
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
                    {seller.products_count} produits · {seller.orders_count} commandes · Score {seller.trust_score}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[seller.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {seller.status === "pending_verification" ? "À vérifier" : seller.status}
                </span>
                {seller.status === "pending_verification" && (
                  <>
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
              </div>
            </div>
          ))}
          <AdminPagination meta={meta} onPage={setPage} />
        </div>
      )}
    </div>
  );
}