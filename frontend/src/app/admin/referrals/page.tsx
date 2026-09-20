"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2 } from "lucide-react";
import { getAdminReferrals, type AdminReferral } from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";

const statusFilter = [
  { value: "", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "rewarded", label: "Récompensés" },
  { value: "expired", label: "Expirés" },
];

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<AdminReferral[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminReferrals({ status: status || undefined, page })
      .then((result) => {
        if (cancelled) return;
        setReferrals(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les parrainages.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parrainages</h1>
        <p className="text-sm text-gray-600">Suivi des références d&apos;inscription et de leurs récompenses.</p>
      </div>

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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Gift className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          Aucun parrainage trouvé.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Parrain</th>
                <th className="px-4 py-3 font-medium">Filleul</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Code de récompense</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.map((referral) => (
                <tr key={referral.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{referral.referrer?.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">
                      {referral.referrer?.email ?? "—"}
                      {referral.referrer?.code ? ` · Code ${referral.referrer.code}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{referral.referred_user?.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{referral.referred_user?.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      referral.status === "rewarded"
                        ? "bg-emerald-50 text-emerald-700"
                        : referral.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                    }`}>
                      {referral.status === "rewarded" ? "Récompensé" : referral.status === "pending" ? "En attente" : "Expiré"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{referral.reward_code ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {referral.created_at ? new Date(referral.created_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-4 py-3">
            <AdminPagination meta={meta} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}