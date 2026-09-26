"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownToLine,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calculator,
  CalendarRange,
  Check,
  Clock,
  Loader2,
  Package,
  Percent,
  PieChart,
  Plus,
  Receipt,
  ShoppingCart,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createSellerExpense,
  deleteSellerExpense,
  getSellerAccounting,
  getSellerFinances,
  requestSellerPayout,
  updateSellerGoal,
  type AccountingReport,
  type SellerFinances,
} from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import SellerOnboardingGate from "@/components/SellerOnboardingGate";

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

const PERIOD_KEYS: PeriodKey[] = ["today", "week", "month", "year", "custom"];

const EXPENSE_CATEGORIES = [
  "supplies",
  "transport",
  "marketing",
  "salaries",
  "rent",
  "equipment",
  "fees",
  "other",
];

function isoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function firstOfMonth(): string {
  const now = new Date();
  return isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function rangeFor(
  period: PeriodKey,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: isoDate(now), to: isoDate(now) };
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: isoDate(start), to: isoDate(now) };
    }
    case "month":
      return { from: firstOfMonth(), to: isoDate(now) };
    case "year":
      return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: isoDate(now) };
    default:
      return { from: customFrom, to: customTo };
  }
}

export default function SellerFinancesPage() {
  const t = useTranslations("seller");
  const locale = useLocale();

  const [finances, setFinances] = useState<SellerFinances | null>(null);
  const [accounting, setAccounting] = useState<AccountingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [goalEditing, setGoalEditing] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("supplies");
  const [expDate, setExpDate] = useState(() => isoDate(new Date()));
  const [expDescription, setExpDescription] = useState("");
  const [expReceipt, setExpReceipt] = useState<File | null>(null);
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { from, to } = rangeFor(period, customFrom, customTo);
    try {
      const [f, a] = await Promise.all([
        getSellerFinances(),
        getSellerAccounting(from, to),
      ]);
      setFinances(f);
      setAccounting(a);
      setMethod((prev) => prev ?? f.payout_method ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finances.loadError"));
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, t]);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const selectPeriod = (p: PeriodKey) => {
    if (p === "custom") {
      setCustomFrom((prev) => prev || firstOfMonth());
      setCustomTo((prev) => prev || isoDate(new Date()));
    }
    setPeriod(p);
  };

  const submitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPayout(true);
    setError(null);
    setSuccess(null);
    try {
      const minor = Math.round(Number(amount) * 100);
      if (!Number.isFinite(minor) || minor < 100) {
        throw new Error(t("finances.invalidAmount"));
      }
      const result = await requestSellerPayout(minor, method ?? undefined);
      setSuccess(result.message);
      setAmount("");
      void load();
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      setError(
        apiErr.errors?.amount_minor?.[0] ??
          (err instanceof Error ? err.message : t("finances.payoutError")),
      );
    } finally {
      setSubmittingPayout(false);
    }
  };

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const minor = Math.round(Number(expAmount) * 100);
      if (!Number.isFinite(minor) || minor < 100) {
        throw new Error(t("finances.invalidAmount"));
      }
      await createSellerExpense({
        amount_minor: minor,
        category: expCategory,
        incurred_at: expDate,
        description: expDescription.trim() || undefined,
        receipt: expReceipt ?? undefined,
      });
      setSuccess(t("finances.accounting.expenseAdded"));
      setExpenseOpen(false);
      setExpAmount("");
      setExpDescription("");
      setExpReceipt(null);
      void load();
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      setError(
        apiErr.errors?.amount_minor?.[0] ??
          apiErr.errors?.receipt?.[0] ??
          (err instanceof Error ? err.message : t("finances.accounting.expenseAdded")),
      );
    } finally {
      setExpSubmitting(false);
    }
  };

  const deleteExpense = async (id: number) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    setError(null);
    setSuccess(null);
    try {
      await deleteSellerExpense(id);
      setSuccess(t("finances.accounting.expenseDeleted"));
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finances.loadError"));
    }
  };

  const startGoalEdit = () => {
    if (!accounting) return;
    setGoalInput(String(Math.round(accounting.goal.monthly_minor / 100)));
    setGoalEditing(true);
  };

  const saveGoal = async () => {
    if (!accounting) return;
    const minor = Math.round(Number(goalInput) * 100);
    if (!Number.isFinite(minor) || minor < 0) {
      setError(t("finances.invalidAmount"));
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await updateSellerGoal(minor);
      setSuccess(t("finances.accounting.goalSaved"));
      setGoalEditing(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("finances.loadError"));
    }
  };

  if (loading && !finances && !accounting) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !finances && !accounting) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!finances || !accounting) return null;

  const range = rangeFor(period, customFrom, customTo);
  const s = accounting.summary;
  const balance = accounting.balance;

  return (
    <SellerOnboardingGate>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{t("finances.title")}</h1>
            <p className="text-sm text-gray-600">{t("finances.subtitle")}</p>
          </div>
          {accounting.goal.monthly_minor > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Target className="h-3.5 w-3.5" />
              {t("finances.accounting.progressOf", {
                achieved: formatPrice(accounting.goal.achieved_minor),
                goal: formatPrice(accounting.goal.monthly_minor),
              })}
            </span>
          )}
        </div>

        {(success || error) && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error ?? success}
          </div>
        )}

        {/* Filtre de période */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => selectPeriod(key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  period === key
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t(`finances.period.${key}`)}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                {t("finances.period.from")}
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5"
                />
              </label>
              <label className="flex items-center gap-2 text-gray-600">
                {t("finances.period.to")}
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5"
                />
              </label>
            </div>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarRange className="h-3.5 w-3.5" />
            {t("finances.accounting.periodFrom", {
              from: new Date(`${range.from}T00:00:00`).toLocaleDateString(locale === "wo" ? "fr-FR" : locale),
              to: new Date(`${range.to}T00:00:00`).toLocaleDateString(locale === "wo" ? "fr-FR" : locale),
            })}
          </p>
        </div>

        {/* Solde */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
              <Wallet className="h-4 w-4" />
              {t("finances.availableBalance")}
            </p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">
              {formatPrice(balance.available)}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              {t("finances.withdrawableOn", {
                method: String(finances.payout_method ?? "Wave").toUpperCase(),
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {t("finances.pendingEscrow")}
                </p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {formatPrice(balance.pending)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{t("finances.nextPayout")}</p>
                <p className="text-sm font-semibold text-gray-700">
                  {finances.next_payout.scheduled_for
                    ? new Date(finances.next_payout.scheduled_for).toLocaleDateString("fr-FR")
                    : t("finances.noFixedDate")}
                </p>
                <p className="text-xs text-gray-500">{formatPrice(balance.pending)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques financières */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={t("finances.accounting.revenue")}
            value={formatPrice(s.sales_gross)}
            icon={TrendingUp}
            tone="text-indigo-700 bg-indigo-50"
          />
          <StatCard
            label={t("finances.accounting.estimatedProfit")}
            value={formatPrice(s.benefit)}
            icon={ArrowUpRight}
            tone="text-emerald-700 bg-emerald-50"
          />
          <StatCard
            label={t("finances.accounting.expenses")}
            value={formatPrice(s.expenses)}
            icon={ArrowDownRight}
            tone="text-rose-700 bg-rose-50"
          />
          <StatCard
            label={t("finances.accounting.synthBalance")}
            value={formatPrice(balance.available)}
            icon={Wallet}
            tone="text-amber-700 bg-amber-50"
          />
        </div>

        {/* Tableau de synthèse */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {t("finances.accounting.synthesis")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("finances.accounting.synthesisSubtitle")}
              </p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <SynthRow
                  label={t("finances.accounting.synthSales")}
                  hint={t("finances.bookkeeping.salesCount", { count: s.sales_count })}
                  value={formatPrice(s.sales_gross)}
                />
                <SynthRow
                  label={t("finances.accounting.synthCommissions")}
                  value={`− ${formatPrice(s.commissions)}`}
                  muted
                />
                <SynthRow
                  label={t("finances.bookkeeping.paymentFees")}
                  value={`− ${formatPrice(s.fees)}`}
                  muted
                />
                <SynthRow
                  label={t("finances.accounting.synthExpenses")}
                  value={`− ${formatPrice(s.expenses)}`}
                  muted
                />
                <SynthRow
                  label={t("finances.accounting.synthProfit")}
                  value={formatPrice(s.benefit)}
                  strong
                />
                <SynthRow
                  label={t("finances.accounting.synthBalance")}
                  value={formatPrice(balance.available)}
                  total
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Objectif de ventes */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t("finances.accounting.goal")}
                </h2>
                <p className="text-sm text-gray-500">
                  {t("finances.accounting.goalHint", {
                    achieved: formatPrice(accounting.goal.achieved_minor),
                  })}
                </p>
              </div>
            </div>
            {!goalEditing ? (
              <button
                type="button"
                onClick={startGoalEdit}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
              >
                <Target className="h-4 w-4" />
                {t("finances.accounting.goalEdit")}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder={t("finances.accounting.goalPlaceholder")}
                    className="w-40 rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    FCFA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void saveGoal()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  aria-label={t("finances.accounting.goalSave")}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGoalEditing(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 text-gray-600 hover:border-gray-400 transition-colors"
                  aria-label={t("finances.accounting.goalCancel")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {accounting.goal.monthly_minor > 0 ? (
            <div className="mt-4">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    accounting.goal.progress_pct >= 100 ? "bg-emerald-600" : "bg-emerald-500"
                  }`}
                  style={{ width: `${accounting.goal.progress_pct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>
                  {t("finances.accounting.progressOf", {
                    achieved: formatPrice(accounting.goal.achieved_minor),
                    goal: formatPrice(accounting.goal.monthly_minor),
                  })}
                </span>
                <span>{accounting.goal.progress_pct} %</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              {t("finances.accounting.goalPlaceholder")}
            </p>
          )}
        </div>

        {/* Évolution des revenus et dépenses */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              {t("finances.accounting.evolutionTitle")}
            </h2>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                {t("finances.accounting.evolutionLegendRevenue")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" />
                {t("finances.accounting.evolutionLegendExpenses")}
              </span>
            </div>
          </div>
          <div className="mt-5">
            {accounting.evolution.length === 0 ? (
              <p className="text-sm text-gray-500">{t("finances.accounting.topProductsEmpty")}</p>
            ) : (
              <EvolutionChart series={accounting.evolution} />
            )}
          </div>
        </div>

        {/* Répartition des dépenses par catégorie */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <PieChart className="h-5 w-5 text-emerald-600" />
            {t("finances.accounting.breakdownExpensesTitle")}
          </h2>
          {accounting.expenses_by_category.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              {t("finances.accounting.breakdownExpensesEmpty")}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {accounting.expenses_by_category.map((row) => {
                const pct =
                  s.expenses > 0 ? Math.round((row.total_minor / s.expenses) * 100) : 0;
                return (
                  <div key={row.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {t(`finances.accounting.categories.${row.category}`)}
                      </span>
                      <span className="text-gray-500">
                        {formatPrice(row.total_minor)}
                        <span className="ml-2 inline-block w-9 text-right text-xs text-gray-400">
                          {pct} %
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-rose-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Produits les plus rentables */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Package className="h-5 w-5 text-emerald-600" />
            {t("finances.accounting.topProductsTitle")}
          </h2>
          {accounting.top_products.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              {t("finances.accounting.topProductsEmpty")}
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-gray-100">
              {accounting.top_products.map((product, index) => (
                <li key={product.product_id} className="flex items-center gap-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                    {index + 1}
                  </span>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t("finances.accounting.soldQty", { quantity: product.quantity })}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald-700">
                    {formatPrice(product.revenue_minor)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Détail des ventes */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            {t("finances.accounting.salesTitle")}
          </h2>
          {accounting.sales.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">{t("finances.accounting.salesEmpty")}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-2 pr-3 font-semibold">{t("finances.accounting.colReference")}</th>
                    <th className="pb-2 pr-3 font-semibold">{t("finances.accounting.colDate")}</th>
                    <th className="pb-2 pr-3 text-right font-semibold">{t("finances.accounting.colGross")}</th>
                    <th className="pb-2 pr-3 text-right font-semibold">{t("finances.accounting.colCommission")}</th>
                    <th className="pb-2 pr-3 text-right font-semibold">{t("finances.accounting.colFees")}</th>
                    <th className="pb-2 text-right font-semibold">{t("finances.accounting.colNet")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {accounting.sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="py-2.5 pr-3 font-medium text-gray-900">
                        {sale.order_number ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-600">
                        {new Date(`${sale.date}T00:00:00`).toLocaleDateString(
                          locale === "wo" ? "fr-FR" : locale,
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right text-gray-700">{formatPrice(sale.gross)}</td>
                      <td className="py-2.5 pr-3 text-right text-gray-500">− {formatPrice(sale.commission)}</td>
                      <td className="py-2.5 pr-3 text-right text-gray-500">− {formatPrice(sale.fee)}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-700">
                        {formatPrice(sale.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mes dépenses */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <PieChart className="h-5 w-5 text-emerald-600" />
              {t("finances.accounting.expensesTitle")}
            </h2>
            <button
              type="button"
              onClick={() => setExpenseOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("finances.accounting.addExpense")}
            </button>
          </div>
          {accounting.expenses.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">{t("finances.accounting.expensesEmpty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {accounting.expenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                    <Package className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {t(`finances.accounting.categories.${expense.category}`)}
                      {expense.description ? ` — ${expense.description}` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {expense.incurred_at
                        ? new Date(`${expense.incurred_at}T00:00:00`).toLocaleDateString(
                            locale === "wo" ? "fr-FR" : locale,
                          )
                        : ""}
                      {expense.receipt_url ? (
                        <>
                          {" · "}
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            {t("finances.accounting.viewReceipt")}
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-gray-900">
                    − {formatPrice(expense.amount_minor)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void deleteExpense(expense.id)}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                      confirmDeleteId === expense.id
                        ? "bg-red-600 text-white"
                        : "text-red-500 hover:bg-red-50"
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    {confirmDeleteId === expense.id ? t("finances.accounting.delete") : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Commission plateforme */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Percent className="h-4 w-4 text-emerald-600" />
                {t("finances.platformCommission")}
              </h2>
              <p className="mt-0.5 text-sm text-gray-600">{t("finances.commissionHint")}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-700">
                {finances.commission.rate_pct} %
              </p>
              <p className="text-xs text-gray-500">
                {t("finances.volumeLabel", {
                  volume: formatPrice(finances.commission.monthly_volume),
                })}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {finances.commission.tiers.map((tier, index) => {
              const next = finances.commission.tiers[index + 1];
              return (
                <span
                  key={`${tier.min}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                >
                  {t("finances.from", { price: formatPrice(tier.min), pct: tier.rate_pct })}
                  {next ? null : t("finances.currentRate")}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">{t("finances.scalingHint")}</p>
        </div>

        {/* Retrait */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-base font-semibold text-gray-900">{t("finances.withdrawTitle")}</h2>
          <p className="mb-4 text-sm text-gray-600">{t("finances.withdrawSubtitle")}</p>
          <form onSubmit={(e) => void submitPayout(e)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("finances.amountLabel")}
              </label>
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
                {t("finances.receiveOn")}
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
                    {m === "wave"
                      ? t("finances.methodWave")
                      : m === "orange"
                        ? t("finances.methodOrangeMoney")
                        : t("finances.methodBank")}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingPayout || balance.available < 100}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {submittingPayout ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              {t("finances.requestPayout")}
            </button>
          </form>
        </div>

        {/* Historique des transactions */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-200 p-6">
            <Receipt className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">{t("finances.historyTitle")}</h2>
          </div>
          {finances.transactions.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t("finances.noTransactions")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {finances.transactions.map((tx) => (
                <div key={tx.id} className="grid grid-cols-2 gap-2 p-4 text-sm sm:grid-cols-4">
                  <div>
                    <p className="font-medium text-gray-900">{tx.order_number ?? tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at ?? new Date()).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-xs text-gray-600">
                    <p>{t("finances.saleLine", { amount: formatPrice(tx.amount) })}</p>
                    <p>{t("finances.commissionLine", { amount: formatPrice(tx.commission) })}</p>
                    <p>{t("finances.feeLine", { amount: formatPrice(tx.fee) })}</p>
                  </div>
                  <div className="text-2xl" />
                  <div className="text-right">
                    <p className={`font-bold ${tx.direction === "out" ? "text-red-600" : "text-emerald-700"}`}>
                      {tx.direction === "out" ? "−" : "+"}
                      {formatPrice(tx.net)}
                    </p>
                    <p className="text-xs text-gray-500">{t("finances.netReceived")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialogue : nouvelle dépense */}
        {expenseOpen && (
          <ExpenseModal
            t={t}
            category={expCategory}
            setCategory={setExpCategory}
            amount={expAmount}
            setAmount={setExpAmount}
            date={expDate}
            setDate={setExpDate}
            description={expDescription}
            setDescription={setExpDescription}
            receipt={expReceipt}
            setReceipt={setExpReceipt}
            submitting={expSubmitting}
            onSubmit={(e) => void submitExpense(e)}
            onClose={() => setExpenseOpen(false)}
          />
        )}
      </div>
    </SellerOnboardingGate>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

function SynthRow({
  label,
  value,
  hint,
  muted,
  strong,
  total,
}: {
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  strong?: boolean;
  total?: boolean;
}) {
  return (
    <tr className={total ? "border-t-2 border-gray-200 bg-gray-50" : ""}>
      <td className="px-4 py-2.5">
        <span
          className={`font-medium ${
            total ? "text-gray-900" : muted ? "text-gray-500" : "text-gray-700"
          }`}
        >
          {label}
        </span>
        {hint && <span className="ml-2 text-xs text-gray-400">{hint}</span>}
      </td>
      <td
        className={`px-4 py-2.5 text-right font-semibold ${
          total
            ? "text-gray-900"
            : strong
              ? "text-emerald-700"
              : muted
                ? "text-gray-500"
                : "text-gray-700"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}

function EvolutionChart({
  series,
}: {
  series: { label: string; revenue: number; expenses: number }[];
}) {
  const max = Math.max(1, ...series.flatMap((s) => [s.revenue, s.expenses]));
  const step = series.length > 8 ? Math.ceil(series.length / 8) : 1;
  return (
    <div className="flex items-end gap-1.5">
      {series.map((point, index) => {
        const revenue = point.revenue > 0 ? Math.max(6, Math.round((point.revenue / max) * 120)) : 2;
        const expenses = point.expenses > 0 ? Math.max(6, Math.round((point.expenses / max) * 120)) : 2;
        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-end justify-center gap-1">
              <div
                className="w-2.5 rounded-sm bg-emerald-500"
                style={{ height: revenue }}
                title={`${point.label} · ${formatPrice(point.revenue)}`}
              />
              <div
                className="w-2.5 rounded-sm bg-rose-400"
                style={{ height: expenses }}
                title={`${point.label} · ${formatPrice(point.expenses)}`}
              />
            </div>
            <span className="w-full truncate text-center text-[9px] leading-none text-gray-400">
              {index % step === 0 || index === series.length - 1 ? point.label : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ExpenseModal({
  t,
  category,
  setCategory,
  amount,
  setAmount,
  date,
  setDate,
  description,
  setDescription,
  receipt,
  setReceipt,
  submitting,
  onSubmit,
  onClose,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
  category: string;
  setCategory: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  receipt: File | null;
  setReceipt: (value: File | null) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Plus className="h-4 w-4 text-emerald-600" />
            {t("finances.accounting.expenseFormTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label={t("finances.accounting.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={(e) => onSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("finances.accounting.expenseAmount")}
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                FCFA
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("finances.accounting.expenseCategory")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {EXPENSE_CATEGORIES.map((key) => (
                <option key={key} value={key}>
                  {t(`finances.accounting.categories.${key}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t("finances.accounting.expenseDate")}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("finances.accounting.expenseDescription")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t("finances.accounting.expenseDescriptionPlaceholder")}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("finances.accounting.expenseReceipt")}
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-emerald-500 transition-colors">
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="flex-1 truncate">
                {receipt ? receipt.name : t("finances.accounting.expenseReceiptHint")}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-colors"
            >
              {t("finances.accounting.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t("finances.accounting.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}