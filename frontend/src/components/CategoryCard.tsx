"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type Category } from "@/lib/api";
import { categoryName } from "@/lib/categoryName";
import CategoryIcon from "@/components/CategoryIcon";

const styleMap: Record<string, { color: string; bg: string }> = {
  electronique: { color: "text-blue-700", bg: "bg-blue-50 hover:bg-blue-100" },
  "mode-beaute": { color: "text-pink-700", bg: "bg-pink-50 hover:bg-pink-100" },
  "maison-electromenager": { color: "text-emerald-700", bg: "bg-emerald-50 hover:bg-emerald-100" },
  alimentation: { color: "text-rose-700", bg: "bg-rose-50 hover:bg-rose-100" },
  "bebe-enfants": { color: "text-violet-700", bg: "bg-violet-50 hover:bg-violet-100" },
  "sport-loisirs": { color: "text-lime-700", bg: "bg-lime-50 hover:bg-lime-100" },
  "sante-bien-etre": { color: "text-cyan-700", bg: "bg-cyan-50 hover:bg-cyan-100" },
  "livres-papeterie": { color: "text-orange-700", bg: "bg-orange-50 hover:bg-orange-100" },
  "artisanat-deco": { color: "text-fuchsia-700", bg: "bg-fuchsia-50 hover:bg-fuchsia-100" },
  "auto-motos": { color: "text-slate-700", bg: "bg-slate-50 hover:bg-slate-100" },
  animaux: { color: "text-amber-700", bg: "bg-amber-50 hover:bg-amber-100" },
};

export default function CategoryCard({
  category,
  count,
  selected,
  onSelect,
}: {
  category: Category;
  count: number;
  selected: boolean;
  onSelect?: () => void;
}) {
  const t = useTranslations("product");
  const ct = useTranslations("categories");
  const style = styleMap[category.slug] ?? {
    color: "text-gray-700",
    bg: "bg-gray-50 hover:bg-gray-100",
  };

  return (
    <Link
      href={`/category/${category.slug}`}
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border-2 p-5 sm:p-7 text-left transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg hover:shadow-gray-900/5 hover:-translate-y-0.5"
      }`}
    >
      <div
        className={`mb-4 inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl ${style.bg}`}
      >
        <CategoryIcon
          slug={category.slug}
          icon={category.icon}
          className={`h-6 w-6 sm:h-7 sm:w-7 ${style.color}`}
        />
      </div>
      <h3 className="font-semibold text-gray-900">
        {categoryName(ct, category.name, category.slug)}
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        {t("productsCount", { count: count.toLocaleString("fr-FR") })}
      </p>
    </Link>
  );
}