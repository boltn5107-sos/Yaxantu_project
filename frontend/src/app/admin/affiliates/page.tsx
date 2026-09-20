"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Megaphone, Search, ArrowRight } from "lucide-react";
import {
  getAdminAffiliates,
  createAdminAffiliate,
  type AdminAffiliate,
} from "@/lib/api";

const fmt = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const statusLabel: Record<string, string> = {
  draft: "En attente",
  active: "Actif",
  suspended: "Suspendu",
};

const emptyForm = {
  email: "",
  user_id: "",
  handle: "",
  public_name: "",
  commission_rate_bps: "",
  monthly_cap_minor: "",
  payout_method: "",
  payout_account: "",
  note: "",
  code: "",
  discount_type: "percent",
  discount_value: "10",
  max_discount_per_order_minor: "",
  per_user_limit: "",
  max_discount_total_minor: "",
};

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AdminAffiliate[]>([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    let cancelled = false;
    getAdminAffiliates({ status: status || undefined, q: q || undefined, page })
      .then((result) => {
        if (cancelled) return;
        setAffiliates(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les influenceurs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, page, status, q]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.handle) return;
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await createAdminAffiliate({
          email: form.email.trim() || undefined,
          user_id: form.user_id ? Number(form.user_id) : undefined,
          handle: form.handle.trim().toLowerCase(),
          public_name: form.public_name.trim() || undefined,
          commission_rate_bps: form.commission_rate_bps ? Number(form.commission_rate_bps) : undefined,
          monthly_cap_minor: form.monthly_cap_minor ? Number(form.monthly_cap_minor) : undefined,
          payout_method: form.payout_method || undefined,
          payout_account: form.payout_account.trim() || undefined,
          note: form.note.trim() || undefined,
          code: form.code.trim().toUpperCase() || undefined,
          discount_type: form.discount_type as "percent" | "fixed",
          discount_value: form.discount_value ? Number(form.discount_value) : undefined,
          max_discount_per_order_minor: form.max_discount_per_order_minor
            ? Number(form.max_discount_per_order_minor)
            : undefined,
          per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : undefined,
          max_discount_total_minor: form.max_discount_total_minor
            ? Number(form.max_discount_total_minor)
            : undefined,
        }),
      );
      setForm({ ...emptyForm });
      setShowForm(false);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influenceurs</h1>
          <p className="text-sm text-gray-600">
            Candidatures, commissions et retraits du programme d&apos;affiliation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800"
        >
          <Plus className="h-4 w-4" />
          Nouvel influenceur
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900">Compte lié</h2>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email du compte</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              placeholder="influenceur@exemple.com"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ID utilisateur (ou email)</label>
            <input
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              type="number"
              placeholder="42"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900">Profil influenceur</h2>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Pseudo *</label>
            <input
              value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value })}
              required
              minLength={3}
              placeholder="monpseudo"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nom affiché</label>
            <input
              value={form.public_name}
              onChange={(e) => setForm({ ...form, public_name: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Commission (bps, 500 = 5 %)</label>
            <input
              value={form.commission_rate_bps}
              onChange={(e) => setForm({ ...form, commission_rate_bps: e.target.value })}
              type="number"
              min="0"
              max="10000"
              placeholder="500"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Plafond mensuel de commission (FCFA)</label>
            <input
              value={form.monthly_cap_minor}
              onChange={(e) => setForm({ ...form, monthly_cap_minor: e.target.value })}
              type="number"
              min="0"
              placeholder="50000"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900">Code promo</h2>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code (auto si vide)</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="PYA2026"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type de remise</label>
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Remise * {form.discount_type === "percent" ? "(%)" : "(FCFA)"}
            </label>
            <input
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              type="number"
              min="1"
              max={form.discount_type === "percent" ? 100 : undefined}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Remise max / commande (FCFA)</label>
            <input
              value={form.max_discount_per_order_minor}
              onChange={(e) => setForm({ ...form, max_discount_per_order_minor: e.target.value })}
              type="number"
              min="0"
              placeholder="500"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Utilisations max par client</label>
            <input
              value={form.per_user_limit}
              onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
              type="number"
              min="1"
              placeholder="2"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cumul max de remise (FCFA)</label>
            <input
              value={form.max_discount_total_minor}
              onChange={(e) => setForm({ ...form, max_discount_total_minor: e.target.value })}
              type="number"
              min="0"
              placeholder="10000"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Note admin</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy === "create"}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
            >
              {busy === "create" && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer et activer
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
              setReload((n) => n + 1);
            }}
            placeholder="Rechercher un pseudo, un nom, un email…"
            className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            setReload((n) => n + 1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">En attente</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : affiliates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          Aucun influenceur pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Influenceur</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Solde (dispo/attente)</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Inscrit le</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {affiliates.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">@{a.handle}</p>
                    <p className="text-xs text-gray-500">
                      {a.public_name}
                      {a.user?.email ? ` · ${a.user.email}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        a.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : a.status === "draft"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {statusLabel[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{a.commission_rate_pct} %</td>
                  <td className="px-4 py-3 text-gray-700">
                    {fmt(a.balance.available)} / {fmt(a.balance.pending)}
                  </td>
                  <td className="px-4 py-3">
                    {a.code ? (
                      <code className="font-mono text-xs font-semibold text-gray-900">{a.code}</code>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        href={`/admin/affiliates/${a.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Détails
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {meta.current_page} / {meta.last_page} ({meta.total} influenceurs)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}