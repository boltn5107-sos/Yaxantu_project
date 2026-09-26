"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminPagination({
  meta,
  onPage,
}: {
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  onPage: (page: number) => void;
}) {
  const t = useTranslations("pagination");
  if (meta.last_page <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm">
      <span className="text-gray-500">
        {t("pageInfo", { current: meta.current_page, last: meta.last_page, total: meta.total })}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={meta.current_page <= 1}
          onClick={() => onPage(meta.current_page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("prev")}
        </button>
        <button
          type="button"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          {t("next")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}