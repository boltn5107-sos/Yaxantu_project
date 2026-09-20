"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, ArrowDownToLine, Clock, Receipt, Loader2, Percent } from "lucide-react";
import {
  getSellerFinances,
  requestSellerPayout,
  type SellerFinances,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import SellerOnboardingGate from "@/components/SellerOnboardingGate";

export default function SellerFinancesPage() {
  const [data, setData] = useState<SellerFinances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSellerFinances();
      setData(result);
      setMethod(result.payout_method);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger vos finances.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const minor = Math.round(Number(amount) * 100);
      if (!Number.isFinite(minor) || minor < 100) {
        throw new Error("Entrez un montant valide (en FCFA).");
      }
      const result = await requestSellerPayout(minor, method ?? undefined);
      setSuccess(result.message);
      setAmount("");
      await load();
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      setError(
        apiErr.errors?.amount_minor?.[0] ??
          (err instanceof Error ? err.message : "Retrait impossible."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const availableMinor = data.balance.available;

  return (
    <SellerOnboardingGate>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes comptes</h1>
          <p className="text-sm text-gray-600">
            Votre argent, vos retraits, sans frais avant la première vente.
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-medium text-emerald-800">Solde disponible</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">
            {formatPrice(data.balance.available)}
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">
            Retirable à tout moment sur votre {String(data.payout_method ?? "Wave").toUpperCase()}.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                En attente (séquestre)
              </p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {formatPrice(data.balance.pending)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Prochain versement</p>
              <p className="text-sm font-semibold text-gray-700">
                {data.next_payout.scheduled_for
                  ? new Date(data.next_payout.scheduled_for).toLocaleDateString("fr-FR")
                  : "Sans rendez-vous fixe"}
              </p>
              <p className="text-xs text-gray-500">{formatPrice(data.balance.pending)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Percent className="h-4 w-4 text-blue-600" />
              Commission Yaxantu
            </h2>
            <p className="mt-0.5 text-sm text-gray-600">
              Retenue sur chaque vente, calculée sur vos 30 derniers jours.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-700">
              {data.commission.rate_pct} %
            </p>
            <p className="text-xs text-gray-500">
              Volume : {formatPrice(data.commission.monthly_volume)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {data.commission.tiers.map((tier, index) => {
            const next = data.commission.tiers[index + 1];
            return (
              <span
                key={tier.min}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
              >
                Dès {formatPrice(tier.min)} → {tier.rate_pct} %
                {next ? null : " (taux actuel)"}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Plus votre volume de ventes augmente, plus la commission diminue.
          Consultez le détail par vente dans l&apos;historique de commande.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Retirer mon argent</h2>
        <p className="mb-4 text-sm text-gray-600">
          L&apos;argent arrive sur votre moyen de paiement choisi.
        </p>
        <form onSubmit={(e) => void submitPayout(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Montant en FCFA</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-bold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                FCFA
              </span>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Recevoir sur
            </label>
            <div className="flex gap-2">
              {["wave", "orange", "bank"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    method === m
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {m === "wave" ? "Wave" : m === "orange" ? "Orange Money" : "Banque"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || availableMinor < 100}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Demander le retrait
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 p-6">
          <Receipt className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Historique des transactions</h2>
        </div>
        {data.transactions.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            Aucune transaction pour l&apos;instant. Vos vente/commission/net apparaîtront ici.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.transactions.map((t) => (
              <div key={t.id} className="grid grid-cols-2 gap-2 p-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="font-medium text-gray-900">{t.order_number ?? t.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.created_at ?? new Date()).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="text-xs text-gray-600">
                  <p>Vente : {formatPrice(t.amount)}</p>
                  <p>Commission : -{formatPrice(t.commission)}</p>
                  <p>Frais : -{formatPrice(t.fee)}</p>
                </div>
                <div className="text-2xl" />
                <div className="text-right">
                  <p className={`font-bold ${t.direction === "out" ? "text-red-600" : "text-emerald-700"}`}>
                    {t.direction === "out" ? "−" : "+"}{formatPrice(t.net)}
                  </p>
                  <p className="text-xs text-gray-500">Net reçu</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </SellerOnboardingGate>
  );
}