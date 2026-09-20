"use client";

import Link from "next/link";
import {
  Smartphone,
  Shirt,
  Home,
  Apple,
  Package,
} from "lucide-react";
import { type Category } from "@/lib/api";

const iconMap: Record<string, typeof Package> = {
  electronique: Smartphone,
  "mode-beaute": Shirt,
  "maison-electromenager": Home,
  alimentation: Apple,
};

const styleMap: Record<string, { color: string; bg: string }> = {
  electronique: { color: "text-blue-700", bg: "bg-blue-50 hover:bg-blue-100" },
  "mode-beaute": { color: "text-pink-700", bg: "bg-pink-50 hover:bg-pink-100" },
  "maison-electromenager": { color: "text-emerald-700", bg: "bg-emerald-50 hover:bg-emerald-100" },
  alimentation: { color: "text-rose-700", bg: "bg-rose-50 hover:bg-rose-100" },
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
  const Icon = iconMap[category.slug] ?? Package;
  const style = styleMap[category.slug] ?? {
    color: "text-gray-700",
    bg: "bg-gray-50 hover:bg-gray-100",
  };

  return (
    <Link
      href={`/category/${category.slug}`}
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${style.bg}`}
      >
        <Icon className={`h-6 w-6 ${style.color}`} />
      </div>
      <h3 className="font-semibold text-gray-900">{category.name}</h3>
      <p className="mt-1 text-xs text-gray-500">
        {count.toLocaleString("fr-FR")} produits
      </p>
    </Link>
  );
}