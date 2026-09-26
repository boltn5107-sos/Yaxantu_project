import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import "../globals.css";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { AuthProvider } from "@/lib/auth";
import { Truck, Shield, Headphones } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "layout" });

  return {
    title: t("title"),
    description: t("description"),
    icons: { icon: "/image/logo.png", apple: "/image/logo.png" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "footer" });

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <NextIntlClientProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1 pb-16 lg:pb-0">{children}</main>
            <footer className="border-t border-gray-200 bg-white">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-24 lg:pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div>
                    <Link href="/" className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/image/logo.png"
                        alt="Taaba-taaba"
                        className="h-9 w-9 rounded-[10px] object-cover shadow-sm"
                      />
                      <span className="text-lg font-bold tracking-wider text-emerald-700">
                        taaba-taaba
                      </span>
                    </Link>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                      {t("tagline")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      {t("marketplace")}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      <li>
                        <Link href="/" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("home")}
                        </Link>
                      </li>
                      <li>
                        <Link href="/search" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("search")}
                        </Link>
                      </li>
                      <li>
                        <Link href="/seller" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("sell")}
                        </Link>
                      </li>
                      <li>
                        <Link href="/favorites" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("favorites")}
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      {t("support")}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      <li>
                        <Link href="/help" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("help")}
                        </Link>
                      </li>
                      <li>
                        <Link href="/contact" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("contact")}
                        </Link>
                      </li>
                      <li>
                        <Link href="/terms" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("terms")}
                        </Link>
                      </li>
                      <li>
                        <Link href="/privacy" className="text-sm text-gray-600 hover:text-emerald-700 transition-colors">
                          {t("privacy")}
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      {t("contactHeading")}
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600">
                      <li>{t("email")}</li>
                      <li>{t("phone")}</li>
                      <li>{t("address")}</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6">
                  <p className="text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Taaba-taaba. {t("rights")}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <Truck className="h-4 w-4" />
                    <Shield className="h-4 w-4" />
                    <Headphones className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </footer>
            <MobileNav />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}