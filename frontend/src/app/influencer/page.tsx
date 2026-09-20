"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Copy,
  Check,
  Megaphone,
  Wallet,
  TrendingUp,
  Gift,
  ListOrdered,
  RefreshCw,
} from "lucide-react";
import {
  getMyAffiliate,
  applyAffiliate,
  requestAffiliatePayout,
  type AffiliateSpace,
} from "@/lib/api";

const fmt = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;

const emptyForm = {
  handle: "",
  public_name: "",
  motivation: "",
  payout_method: "",
  payout_account: "",
};

export default function InfluencerPage() {
  const [space, setSpace] = useState<AffiliateSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });
  const [payoutAmount, setPayoutAmount] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyAffiliate()
      .then((result) => {
        if (cancelled) return;
        setSpace(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Espace influenceur indisponible.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.handle) return;
    setBusy("apply");
    setError(null);
    setNotice(null);
    try {
      await applyAffiliate({
        handle: form.handle.trim(),
        public_name: form.public_name.trim() || undefined,
        motivation: form.motivation.trim() || undefined,
        payout_method: form.payout_method || undefined,
        payout_account: form.payout_account.trim() || undefined,
      });
      setNotice(
        "Candidature envoyée. Un administrateur va l'examiner avant activation.",
      );
      setForm({ ...emptyForm });
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Candidature impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payoutAmount);
    if (!Number.isInteger(amount) || amount <= 0) return;
    setBusy("payout");
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await requestAffiliatePayout({
          amount_minor: amount,
          method: space?.affiliate?.payout_method ?? undefined,
        }) && "Retrait demandé. Il sera traité après validation.",
      );
      setPayoutAmount("");
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demande de retrait impossible.");
    } finally {
      setBusy(null);
    }
  };

  const affiliate = space?.affiliate ?? null;
  const code = space?.code ?? null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Megaphone className="h-6 w-6 text-purple-700" />
            Espace influenceur
          </h1>
          <p className="text-sm text-gray-600">
            Gagnez des commissions en faisant découvrir la boutique.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReload((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualiser
        </button>
      </div>

      {notice && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : affiliate === null ? (
        <form
          onSubmit={handleApply}
          className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-6 sm:grid-cols-2"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Rejoindre le programme
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Partagez votre code promo, on vous reverse une commission sur chaque
              vente.
            </p>
          </div>
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Pseudo influenceur *{" "}
                <span className="text-gray-400">(lettres, chiffres, _ ou -)</span>
              </label>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nom affiché
              </label>
              <input
                value={form.public_name}
                onChange={(e) => setForm({ ...form, public_name: e.target.value })}
                placeholder="Ma petite entreprise"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Motivation
              </label>
              <textarea
                value={form.motivation}
                onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                rows={3}
                placeholder="Comment comptez-vous promouvoir nos produits ?"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mode de versement
              </label>
              <select
                value={form.payout_method}
                onChange={(e) => setForm({ ...form, payout_method: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="">À choisir plus tard</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="wave">Wave</option>
                <option value="bank">Virement bancaire</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Numéro / compte de versement
              </label>
              <input
                value={form.payout_account}
                onChange={(e) => setForm({ ...form, payout_account: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy === "apply"}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-60"
            >
              {busy === "apply" && <Loader2 className="h-4 w-4 animate-spin" />}
              Envoyer ma candidature
            </button>
          </div>
        </form>
      ) : affiliate.status === "draft" ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-amber-600" />
          <h2 className="text-lg font-semibold text-amber-900">
            Candidature en attente d&apos;examen
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-amber-800">
            Un administrateur va valider votre profil et activer votre code promo.
            Revenez ici bientôt.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                <Gift className="h-4 w-4" />
                Votre code promo
              </div>
              {code ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="rounded-lg bg-purple-50 px-3 py-2 font-mono text-base font-bold tracking-widest text-purple-900">
                    {code.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copy(code.code)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" /> Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copier
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Code non disponible pour le moment.
                </p>
              )}
              {code && (
                <p className="mt-3 text-xs text-gray-500">
                  Réduction de{" "}
                  {code.discount_type === "percent"
                    ? `${code.discount_value} %`
                    : fmt(code.discount_value)}
                  {code.max_discount_per_order
                    ? ` · max ${fmt(code.max_discount_per_order)} / commande`
                    : ""}
                  {code.used_count > 0
                    ? ` · déjà utilisé ${code.used_count}×`
                    : ""}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Wallet className="h-4 w-4" />
                Solde
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {fmt(space?.balance?.available ?? 0)}
              </p>
              <p className="text-xs text-gray-500">
                En attente de validation : {fmt(space?.balance?.pending ?? 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <TrendingUp className="h-4 w-4" />
                Vos performances
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {space?.stats.orders_count ?? 0} vente
                {(space?.stats.orders_count ?? 0) > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-gray-500">
                {fmt(space?.stats.sales_minor ?? 0)} de commandes générées ·{" "}
                {fmt(space?.stats.discount_granted_minor ?? 0)} de réduction offerte
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Commission
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {affiliate.commission_rate_pct} %
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Commissions approuvées
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {fmt(space?.stats.commissions.approved ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cumul du mois
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {fmt(space?.stats.monthly_total ?? 0)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <form
              onSubmit={handlePayout}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Wallet className="h-5 w-5 text-emerald-700" />
                Demander un retrait
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Retrait minimal : {fmt(space?.payout_rules.min_amount ?? 0)}.
                Après validation par un administrateur, votre solde est recrédité
                en cas de rejet.
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Montant (FCFA)
                  </label>
                  <input
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    type="number"
                    min={space?.payout_rules.min_amount ?? 1}
                    placeholder={String(space?.payout_rules.min_amount ?? 1000)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy === "payout" || (space?.balance.available ?? 0) <= 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {busy === "payout" && <Loader2 className="h-4 w-4 animate-spin" />}
                  Retirer
                </button>
              </div>
              {affiliate.payout_account && (
                <p className="mt-3 text-xs text-gray-500">
                  Versement sur : {affiliate.payout_account}
                </p>
              )}
            </form>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ListOrdered className="h-5 w-5 text-blue-700" />
                Commissions récentes
              </h2>
              {space?.commissions.length ? (
                <ul className="mt-3 divide-y divide-gray-100">
                  {space.commissions.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          Commande {c.order_number ?? `#${c.id}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {c.rate_pct} % sur {fmt(c.base_amount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{fmt(c.amount)}</p>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            c.status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : c.status === "reversed"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {c.status === "approved"
                            ? "Validée"
                            : c.status === "reversed"
                              ? "Annulée"
                              : "En attente"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  Aucune commission pour le moment.
                </p>
              )}
            </div>
          </div>

          {space?.payouts?.length ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-gray-900">Retraits</h2>
              <ul className="mt-3 divide-y divide-gray-100">
                {space.payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{fmt(p.amount)}</p>
                      <p className="text-xs text-gray-500">
                        {p.method === "mobile_money"
                          ? "Mobile Money"
                          : p.method === "wave"
                            ? "Wave"
                            : "Virement bancaire"}
                        {p.requested_at
                          ? ` · ${new Date(p.requested_at).toLocaleDateString("fr-FR")}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        p.status === "paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.status === "paid"
                        ? "Payé"
                        : p.status === "rejected"
                          ? "Rejeté"
                          : p.status === "approved"
                            ? "Approuvé"
                            : "En cours"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}