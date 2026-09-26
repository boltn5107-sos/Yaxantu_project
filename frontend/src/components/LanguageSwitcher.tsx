"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Check, Globe } from "lucide-react";

const locales = [
  { code: "fr", label: "Français" },
  { code: "wo", label: "Wolof" },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const switchTo = useCallback(
    (code: (typeof locales)[number]["code"]) => {
      router.replace(pathname, { locale: code });
      setOpen(false);
    },
    [pathname, router],
  );

  const current = locales.find((l) => l.code === locale)?.label ?? "Français";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{current}</span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("language")}
          className="absolute right-0 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        >
          {locales.map((l) => {
            const active = l.code === locale;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => switchTo(l.code)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-emerald-50 font-semibold text-emerald-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {l.label}
                {active && (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}