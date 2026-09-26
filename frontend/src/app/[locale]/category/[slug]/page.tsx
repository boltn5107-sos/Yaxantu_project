"use client";

import { use } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, PackageOpen } from "lucide-react";
import { getCategories, getProducts, type Category, type Product } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { categoryName } from "@/lib/categoryName";
import ProductCard from "@/components/ProductCard";
import CategoryCard from "@/components/CategoryCard";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const t = useTranslations("category");
  const ct = useTranslations("categories");

  const { data: categories } = useApi(
    () => getCategories().then((c) => c.filter((cat) => cat.is_main)),
    [],
    [] as Category[],
  );

  const { data: products, loading } = useApi(
    () => getProducts({ category: slug, per_page: 24 }),
    [slug],
    [] as Product[],
  );

  const { data: suggestions } = useApi(
    () => getProducts({ per_page: 4, sort: "popular" }),
    [],
    [] as Product[],
  );

  const foundCategory = categories.find((c) => c.slug === slug);
  const categoryNameValue = foundCategory
    ? categoryName(ct, foundCategory.name, foundCategory.slug)
    : slug;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/" className="hover:text-emerald-700 transition-colors">{t("home")}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium capitalize">
          {categoryNameValue}
        </span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 capitalize">
          {categoryNameValue}
        </h1>
        <p className="mt-1 text-gray-600">
          {products.length > 0
            ? t("productsCount", { count: products.length })
            : t("loading")}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mb-12">
        {categories
          .filter((c) => c.slug !== slug)
          .map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              count={category.products_count}
              selected={false}
            />
          ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="h-64 bg-gray-200 animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                <div className="h-5 w-1/3 rounded bg-gray-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-16 text-center">
          <PackageOpen className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-4 text-lg font-medium text-gray-900">{t("empty")}</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline">
            {t("backHome")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("discover")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {suggestions.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}