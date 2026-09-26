import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Home, Search } from "lucide-react";

export default async function NotFound() {
  const t = await getTranslations("notfound");

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <span className="text-4xl font-bold text-gray-400">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("message")}</p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            {t("backHome")}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            {t("search")}
          </Link>
        </div>
      </div>
    </div>
  );
}