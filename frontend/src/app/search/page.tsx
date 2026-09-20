"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, PackageOpen } from "lucide-react";
import { getCategories, getProducts, type ProductSort } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import ProductCard from "@/components/ProductCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState<ProductSort>("popular");
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useApi(
    () => getCategories().then((c) => c.filter((cat) => cat.is_main)),
    [],
    [],
  );

  const filters = useMemo(
    () => ({
      q: query || undefined,
      category,
      min_price: minPrice,
      max_price: maxPrice,
      verified: verified || undefined,
      sort,
      per_page: 24,
    }),
    [query, category, minPrice, maxPrice, verified, sort],
  );

  const { data: results, loading } = useApi(
    () => getProducts(filters),
    [query, category, minPrice, maxPrice, verified, sort],
    [] as Awaited<ReturnType<typeof getProducts>>,
  );

  const resetFilters = () => {
    setQuery("");
    setCategory(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setVerified(false);
    setSort("popular");
  };

  const pricePresets = [
    { label: "Moins de 5 000", min: undefined, max: 5000 },
    { label: "5 000 – 25 000", min: 5000, max: 25000 },
    { label: "25 000 – 75 000", min: 25000, max: 75000 },
    { label: "Plus de 75 000", min: 75000, max: undefined },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recherche</h1>
        <p className="mt-1 text-gray-600">
          {query ? `Résultats pour « ${query} »` : "Parcourez tous nos produits"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit, une marque, un vendeur..."
            className="w-full rounded-xl border border-gray-300 bg-white pl-12 pr-10 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setSort("popular")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            sort === "popular" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Populaires
        </button>
        <button
          onClick={() => setSort("newest")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            sort === "newest" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Récents
        </button>
        <button
          onClick={() => setSort("price_asc")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            sort === "price_asc" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Prix ↑
        </button>
        <button
          onClick={() => setSort("price_desc")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            sort === "price_desc" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Prix ↓
        </button>
      </div>

      {showFilters && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Filtres avancés</h3>
            <button onClick={resetFilters} className="text-xs font-medium text-blue-700 hover:underline">
              Tout réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Catégorie</h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.slug} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={category === cat.slug}
                      onChange={() => setCategory(category === cat.slug ? undefined : cat.slug)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Prix</h3>
              <div className="space-y-2">
                {pricePresets.map((preset) => {
                  const isActive = minPrice === preset.min && maxPrice === preset.max;
                  return (
                    <label key={preset.label} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => {
                          if (isActive) {
                            setMinPrice(undefined);
                            setMaxPrice(undefined);
                          } else {
                            setMinPrice(preset.min);
                            setMaxPrice(preset.max);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {preset.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendeur</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Vérifiés uniquement
              </label>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="h-56 bg-gray-200 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                <div className="h-5 w-1/3 rounded bg-gray-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-16 text-center">
          <PackageOpen className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-900">Aucun produit trouvé.</p>
          <p className="mt-1 text-sm text-gray-500">Essayez de modifier vos filtres ou votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}