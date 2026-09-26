"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Search, Package, Loader2, Star } from "lucide-react";
import { getAdminProducts, updateAdminProduct, type AdminProduct } from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";
import { formatPrice } from "@/lib/utils";

const visibilityFilter = [
  { value: "all", labelKey: "products.visibility.all" },
  { value: "active", labelKey: "products.visibility.active" },
  { value: "hidden", labelKey: "products.visibility.hidden" },
  { value: "featured", labelKey: "products.visibility.featured" },
] as const;

export default function AdminProductsPage() {
  const t = useTranslations("admin");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [inputSearch, setInputSearch] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminProducts({
      search: search || undefined,
      visibility: visibility === "all" ? undefined : visibility,
      page,
    })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("products.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, visibility, page, reload]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(inputSearch);
    setPage(1);
    setReload((n) => n + 1);
  };

  const toggle = async (product: AdminProduct, field: "is_active" | "is_featured") => {
    setBusy(product.id);
    setError(null);
    setNotice(null);
    try {
      const message = await updateAdminProduct(product.id, {
        [field]: field === "is_active" ? !product.is_active : !product.is_featured,
      });
      setNotice(message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("products.updateError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("products.title")}</h1>
        <p className="text-sm text-gray-600">{t("products.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              placeholder={t("products.searchPlaceholder")}
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            {t("products.search")}
          </button>
        </form>
        <select
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          {visibilityFilter.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
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
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Package className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {t("products.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("products.table.product")}</th>
                <th className="px-4 py-3 font-medium">{t("products.table.shop")}</th>
                <th className="px-4 py-3 font-medium">{t("products.table.price")}</th>
                <th className="px-4 py-3 font-medium">{t("products.table.stock")}</th>
                <th className="px-4 py-3 font-medium">{t("products.table.sales")}</th>
                <th className="px-4 py-3 font-medium">{t("products.table.status")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("products.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3">
                    <Link href={`/product/${product.slug}`} className="line-clamp-1 font-medium text-gray-900 hover:text-emerald-700">
                      {product.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {product.category?.name ?? t("products.noCategory")}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{product.seller?.shop_name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3 text-gray-700">{product.stock_quantity}</td>
                  <td className="px-4 py-3 text-gray-700">{product.sold_quantity}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {product.is_active ? t("products.active") : t("products.hidden")}
                      </span>
                      {product.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <Star className="h-3 w-3" />
                          {t("products.top")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy === product.id}
                        onClick={() => void toggle(product, "is_active")}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                      >
                        {product.is_active ? t("products.hide") : t("products.activate")}
                      </button>
                      <button
                        type="button"
                        disabled={busy === product.id}
                        onClick={() => void toggle(product, "is_featured")}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                      >
                        {product.is_featured ? t("products.removeFeatured") : t("products.feature")}
                      </button>
                    </div>
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