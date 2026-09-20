"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Package, Loader2, Star } from "lucide-react";
import { getAdminProducts, updateAdminProduct, type AdminProduct } from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";
import { formatPrice } from "@/lib/utils";

const visibilityFilter = [
  { value: "all", label: "Tous les produits" },
  { value: "active", label: "Actifs" },
  { value: "hidden", label: "Masqués" },
  { value: "featured", label: "Mis en avant" },
] as const;

export default function AdminProductsPage() {
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
        setError(err instanceof Error ? err.message : "Impossible de charger les produits.");
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
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <p className="text-sm text-gray-600">Modération du catalogue : masquer, activer, mettre en avant.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={submitSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={inputSearch}
              onChange={(e) => setInputSearch(e.target.value)}
              placeholder="Nom du produit..."
              className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Chercher
          </button>
        </form>
        <select
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {visibilityFilter.map((option) => (
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
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <Package className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          Aucun produit trouvé.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Prix</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Ventes</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-4 py-3">
                    <Link href={`/product/${product.slug}`} className="line-clamp-1 font-medium text-gray-900 hover:text-blue-700">
                      {product.name}
                    </Link>
                    <p className="text-xs text-gray-500">{product.category?.name ?? "Sans catégorie"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{product.seller?.shop_name ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3 text-gray-700">{product.stock_quantity}</td>
                  <td className="px-4 py-3 text-gray-700">{product.sold_quantity}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                        {product.is_active ? "Actif" : "Masqué"}
                      </span>
                      {product.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <Star className="h-3 w-3" />
                          Top
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
                        {product.is_active ? "Masquer" : "Activer"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === product.id}
                        onClick={() => void toggle(product, "is_featured")}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                      >
                        {product.is_featured ? "Retirer du top" : "Mettre en avant"}
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