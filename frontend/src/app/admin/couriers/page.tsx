"use client";

import { useEffect, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
import {
  getAdminCouriers,
  getAdminCouriersPending,
  approveAdminCourier,
  rejectAdminCourier,
  type AdminCourier,
} from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";

type PendingCourier = { id: number; name: string | null; phone: string | null };

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [pending, setPending] = useState<PendingCourier[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminCouriers({ page }), getAdminCouriersPending()])
      .then(([result, pendingResult]) => {
        if (cancelled) return;
        setCouriers(result.data);
        setMeta(result.meta);
        setPending(pendingResult);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les livreurs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, reload]);

  const approveOrReject = async (courier: PendingCourier, approved: boolean) => {
    setBusy(courier.id);
    setError(null);
    setNotice(null);
    try {
      if (approved) {
        setNotice(await approveAdminCourier(courier.id));
      } else {
        const rejectReason = window.prompt("Motif du refus (obligatoire) :");
        if (!rejectReason) return;
        setNotice(await rejectAdminCourier(courier.id, rejectReason));
      }
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Livreurs</h1>
        <p className="text-sm text-gray-600">Approbation des candidatures et liste des transporteurs.</p>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          À approuver ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            Aucune candidature en attente.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((courier) => (
              <div key={courier.id} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Bike className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {courier.name ?? "—"} <span className="text-gray-500">· {courier.phone ?? "—"}</span>
                    </p>
                    <p className="text-xs text-gray-600">Candidature en attente de vérification</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busy === courier.id}
                    onClick={() => void approveOrReject(courier, true)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    {busy === courier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approuver"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === courier.id}
                    onClick={() => void approveOrReject(courier, false)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Livreurs enregistrés ({meta.total})</h2>
        {couriers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            Aucun livreur enregistré.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Livreur</th>
                  <th className="px-4 py-3 font-medium">Transport</th>
                  <th className="px-4 py-3 font-medium">Zone</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Livraisons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {couriers.map((courier) => (
                  <tr key={courier.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{courier.owner?.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{courier.owner?.phone ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-700">{courier.transport_type ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{courier.zone_address ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          courier.status === "active" ? "bg-emerald-50 text-emerald-700" : courier.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                        }`}>
                          {courier.status === "active" ? "Approuvé" : courier.status === "pending" ? "En attente" : courier.status.includes("reject") ? "Refusé" : "Suspendu"}
                        </span>
                        {courier.available && (
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Disponible</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{courier.deliveries_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-gray-200 px-4 py-3">
              <AdminPagination meta={meta} onPage={setPage} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}