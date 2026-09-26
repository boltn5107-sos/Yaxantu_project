"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal, X, PackageOpen, Camera, Loader2 } from "lucide-react";
import { getCategories, getProducts, visualSearchProducts, type Product, type ProductSort } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import ProductCard from "@/components/ProductCard";

export default function SearchPage() {
  const t = useTranslations("search");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState<ProductSort>("popular");
  const [showFilters, setShowFilters] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [visualResults, setVisualResults] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!imageFile) return;
    let cancelled = false;
    const h = window.setTimeout(() => {
      setImageSearching(true);
      setImageError(false);
      visualSearchProducts(imageFile)
        .then((products) => {
          if (!cancelled) setVisualResults(products);
        })
        .catch(() => {
          if (!cancelled) {
            setVisualResults([]);
            setImageError(true);
          }
        })
        .finally(() => {
          if (!cancelled) setImageSearching(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(h);
      cancelled = true;
    };
  }, [imageFile]);

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    setVisualResults([]);
    setImageError(false);
  };

  const resetFilters = () => {
    setQuery("");
    setCategory(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setVerified(false);
    setSort("popular");
    clearImage();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setQuery("");
    setCategory(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setVerified(false);
    setSort("popular");
    setShowFilters(false);
    setVisualResults([]);
    setImageError(false);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const pricePresets = [
    { key: "priceUnder", min: undefined, max: 5000 },
    { key: "priceBetween", min: 5000, max: 25000 },
    { key: "priceBetween", min: 25000, max: 75000 },
    { key: "priceOver", min: 75000, max: undefined },
  ] as const;

  const presetLabel = (
    preset: (typeof pricePresets)[number],
  ): string => {
    if (preset.key === "priceUnder") return t("priceUnder", { max: preset.max });
    if (preset.key === "priceOver") return t("priceOver", { min: preset.min });
    return t("priceBetween", { min: preset.min, max: preset.max });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-1 text-gray-600">
          {imageFile ? t("imageResultsFor") : query ? t("resultsFor", { query }) : t("browse")}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />

      {imageFile ? (
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row">
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview ?? ""}
              alt={t("imageAlt")}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              {imageSearching && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
              {imageSearching ? t("imageSearching") : t("imageResultsFor")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{t("imageHint")}</p>
            {imageError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {t("imageError")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Camera className="h-4 w-4" />
                {t("imageChange")}
              </button>
              <button
                onClick={clearImage}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                <X className="h-4 w-4" />
                {t("imageRemove")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="w-full rounded-xl border border-gray-300 bg-white pl-12 pr-10 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
          <div className="flex items-center gap-3">
            <button
              title={t("searchByImage")}
              aria-label={t("searchByImage")}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">{t("searchByImage")}</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("filters")}
            </button>
          </div>
        </div>
      )}

      {!imageFile && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setSort("popular")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              sort === "popular" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("popular")}
          </button>
          <button
            onClick={() => setSort("newest")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              sort === "newest" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("recent")}
          </button>
          <button
            onClick={() => setSort("price_asc")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              sort === "price_asc" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("priceAsc")}
          </button>
          <button
            onClick={() => setSort("price_desc")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              sort === "price_desc" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("priceDesc")}
          </button>
        </div>
      )}

      {!imageFile && showFilters && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">{t("advanced")}</h3>
            <button onClick={resetFilters} className="text-xs font-medium text-emerald-700 hover:underline">
              {t("reset")}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("category")}</h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.slug} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={category === cat.slug}
                      onChange={() => setCategory(category === cat.slug ? undefined : cat.slug)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("price")}</h3>
              <div className="space-y-2">
                {pricePresets.map((preset) => {
                  const isActive = minPrice === preset.min && maxPrice === preset.max;
                  return (
                    <label key={`${preset.key}-${preset.min ?? 0}-${preset.max ?? 0}`} className="flex items-center gap-2 text-sm text-gray-700">
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
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      {presetLabel(preset)}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t("seller")}</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t("verifiedOnly")}
              </label>
            </div>
          </div>
        </div>
      )}

      {imageFile ? (
        imageSearching ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
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
        ) : imageError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-16 text-center">
            <PackageOpen className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-4 text-lg font-medium text-red-900">{t("imageError")}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <Camera className="h-4 w-4" />
              {t("imageChange")}
            </button>
          </div>
        ) : visualResults.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-16 text-center">
            <PackageOpen className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">{t("noResults")}</p>
            <p className="mt-1 text-sm text-gray-500">{t("imageEmptyHint")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {visualResults.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
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
          <p className="mt-4 text-lg font-medium text-gray-900">{t("noResults")}</p>
          <p className="mt-1 text-sm text-gray-500">{t("noResultsHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}