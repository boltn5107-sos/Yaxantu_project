"use client";

import { useEffect, useState } from "react";
import { Bike, Loader2, Ban, Play } from "lucide-react";
import {
  getAdminCouriers,
  getAdminCouriersPending,
  approveAdminCourier,
  rejectAdminCourier,
  suspendAdminCourier,
  reactivateAdminCourier,
  type AdminCourier,
  type AdminCourierPending,
} from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";

const transportLabel: Record<string, string> = {
  foot: "À pied",
  bike: "Vélo",
  moto: "Moto",
};

const statusBadge: Record<string, { cls: string; label: string }> = {
  draft: { cls: "bg-gray-100 text-gray-600", label: "Brouillon" },
  pending: { cls: "bg-amber-50 text-amber-700", label: "En attente" },
  approved: { cls: "bg-emerald-50 text-emerald-700", label: "Approuvé" },
  rejected: { cls: "bg-red-50 text-red-700", label: "Refusé" },
  suspended: { cls: "bg-gray-100 text-gray-600", label: "Suspendu" },
};

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [pending, setPending] = useState<AdminCourierPending[]>([]);
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

  const run = async (courierId: number, action: () => Promise<string>) => {
    setBusy(courierId);
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

  const handlePending = (courier: AdminCourierPending, approved: boolean) => {
    if (!approved) {
      const reason = window.prompt("Motif du refus (obligatoire) :");
      if (!reason) return;
      return run(courier.id, () => rejectAdminCourier(courier.id, reason));
    }
    return run(courier.id, () => approveAdminCourier(courier.id));
  };

  const suspend = (courier: AdminCourier) => {
    if (!window.confirm(`Suspendre le livreur « ${courier.owner?.name ?? "—"} » ?`)) return;
    return run(courier.id, () => suspendAdminCourier(courier.id));
  };

  const reactivate = (courier: AdminCourier) =>
    run(courier.id, () => reactivateAdminCourier(courier.id));

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
        <p className="text-sm text-gray-600">
          Vérification des pièces d&apos;identité, approbation et suspension des transporteurs.
        </p>
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
              <div
                key={courier.id}
                className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Bike className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {courier.name ?? "—"} <span className="text-gray-500">· {courier.phone ?? "—"}</span>
                    </p>
                    <p className="text-xs text-gray-600">
                      {transportLabel[courier.transport_type ?? ""] ?? courier.transport_type ?? "—"}
                      {courier.zone_address ? ` · ${courier.zone_address}` : ""}
                      {courier.payout_method ? ` · ${courier.payout_method}` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      Candidature {courier.submitted_at ? `reçue le ${new Date(courier.submitted_at).toLocaleDateString("fr-FR")}` : "reçue"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {courier.identity_photo && (
                    <a href={courier.identity_photo} target="_blank" rel="noreferrer">
                      <img
                        src={courier.identity_photo}
                        alt="Pièce d'identité"
                        className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
                      />
                    </a>
                  )}
                  {courier.selfie && (
                    <a href={courier.selfie} target="_blank" rel="noreferrer">
                      <img
                        src={courier.selfie}
                        alt="Selfie de vérification"
                        className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
                      />
                    </a>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy === courier.id}
                      onClick={() => void handlePending(courier, true)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      {busy === courier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approuver"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === courier.id}
                      onClick={() => void handlePending(courier, false)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                    >
                      Refuser
                    </button>
                  </div>
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
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {couriers.map((courier) => {
                  const badge = statusBadge[courier.status] ?? statusBadge.draft;
                  return (
                    <tr key={courier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{courier.owner?.name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{courier.owner?.phone ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-700">{transportLabel[courier.transport_type ?? ""] ?? courier.transport_type ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{courier.zone_address ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {courier.available && (
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Disponible</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{courier.deliveries_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {courier.status === "approved" && (
                            <button
                              type="button"
                              disabled={busy === courier.id}
                              onClick={() => void suspend(courier)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Suspendre
                            </button>
                          )}
                          {courier.status === "suspended" && (
                            <button
                              type="button"
                              disabled={busy === courier.id}
                              onClick={() => void reactivate(courier)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                            >
                              {busy === courier.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                              Réactiver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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