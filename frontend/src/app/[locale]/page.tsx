"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  Truck,
  Shield,
  Headphones,
  ArrowRight,
  TrendingUp,
  Flame,
  Sparkles,
} from "lucide-react";
import { getCategories, getProducts, type Category, type Product } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { fallbackImage } from "@/lib/utils";
import CategoryCard from "@/components/CategoryCard";
import ProductCard from "@/components/ProductCard";
import BannersCarousel from "@/components/BannersCarousel";

const fallbackCategories: Category[] = [
  {
    id: 1,
    slug: "electronique",
    name: "Électronique",
    description: null,
    icon: "smartphone",
    image: null,
    is_main: true,
    products_count: 1240,
  },
  {
    id: 2,
    slug: "mode-beaute",
    name: "Mode & Beauté",
    description: null,
    icon: "shirt",
    image: null,
    is_main: true,
    products_count: 890,
  },
  {
    id: 3,
    slug: "maison-electromenager",
    name: "Maison",
    description: null,
    icon: "home",
    image: null,
    is_main: true,
    products_count: 670,
  },
  {
    id: 4,
    slug: "alimentation",
    name: "Alimentation",
    description: null,
    icon: "grocery",
    image: null,
    is_main: true,
    products_count: 560,
  },
  {
    id: 5,
    slug: "bebe-enfants",
    name: "Bébé & Enfants",
    description: null,
    icon: "baby",
    image: null,
    is_main: true,
    products_count: 320,
  },
  {
    id: 6,
    slug: "sport-loisirs",
    name: "Sport & Loisirs",
    description: null,
    icon: "dumbbell",
    image: null,
    is_main: true,
    products_count: 410,
  },
  {
    id: 7,
    slug: "sante-bien-etre",
    name: "Santé & Bien-être",
    description: null,
    icon: "heart-pulse",
    image: null,
    is_main: true,
    products_count: 270,
  },
  {
    id: 8,
    slug: "livres-papeterie",
    name: "Livres & Papeterie",
    description: null,
    icon: "book-open",
    image: null,
    is_main: true,
    products_count: 190,
  },
  {
    id: 9,
    slug: "artisanat-deco",
    name: "Artisanat & Déco",
    description: null,
    icon: "palette",
    image: null,
    is_main: true,
    products_count: 230,
  },
  {
    id: 10,
    slug: "auto-motos",
    name: "Auto & Moto",
    description: null,
    icon: "car",
    image: null,
    is_main: true,
    products_count: 150,
  },
  {
    id: 11,
    slug: "animaux",
    name: "Animaux",
    description: null,
    icon: "paw-print",
    image: null,
    is_main: true,
    products_count: 90,
  },
];

function mockProduct(
  id: number,
  name: string,
  slug: string,
  price: number,
  rating: number,
  reviews: number,
  seller: string,
  verified = true,
): Product {
  return {
    id,
    slug,
    name,
    short_description: null,
    description: null,
    price,
    currency: "XOF",
    stock_quantity: 10,
    in_stock: true,
    rating_average: rating,
    rating_count: reviews,
    is_featured: false,
    is_active: true,
    requires_shipping: true,
    thumbnail: fallbackImage(400, 300, id),
    images: [],
    seller: { id, shop_name: seller, slug, logo: null, verification_level: verified ? 2 : 0, verified },
    category: null,
    created_at: null,
  };
}

const fallbackPopular: Product[] = [
  mockProduct(1, "Smartphone Pro X200", "smartphone-pro-x200", 45000, 4.5, 128, "TechStore CM"),
  mockProduct(2, "Chaussures de Course Premium", "chaussures-course-premium", 12500, 4.8, 89, "SportPlus"),
  mockProduct(3, "Livre Aventure - Le Trésor Perdu", "livre-aventure-tresor-perdu", 3500, 4.2, 45, "Librairie Centrale", false),
  mockProduct(4, "Set Ustensiles de Cuisine", "set-ustensiles-cuisine", 28000, 4.7, 156, "Maison & Plus"),
];

const fallbackHotDeals: Product[] = [
  mockProduct(5, "Casque Audio Bluetooth", "casque-audio-bluetooth", 8500, 4.6, 234, "AudioWorld"),
  mockProduct(6, "Montre Connectée Sport", "montre-connectee-sport", 22000, 4.4, 167, "GadgetPro"),
];

const features = [
  {
    icon: Truck,
    label: "featFastTitle",
    description: "featFastDesc",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Shield,
    label: "featSecureTitle",
    description: "featSecureDesc",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Headphones,
    label: "featSupportTitle",
    description: "featSupportDesc",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
] as const;

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("home");
  const router = useRouter();

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const { data: categories } = useApi(
    () => getCategories().then((cats) => cats.filter((c) => c.is_main)),
    [],
    fallbackCategories,
  );

  const { data: hotDeals } = useApi(
    () => getProducts({ sort: "rating", per_page: 4 }),
    [],
    fallbackHotDeals,
  );

  const { data: popular } = useApi(
    () => getProducts({ sort: "popular", per_page: 4 }),
    [],
    fallbackPopular,
  );

  return (
    <div className="space-y-16">
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-950 text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-[0.07]" />
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-teal-300/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 pl-1.5 pr-3.5 py-1 text-xs font-medium text-white/90 backdrop-blur ring-1 ring-white/20">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                <TrendingUp className="h-3 w-3" />
              </span>
              {t("newProducts")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 text-lg text-emerald-100 leading-relaxed max-w-2xl text-pretty">
              {t("heroSubtitle")}
            </p>

            <form onSubmit={submitSearch} className="mt-8 max-w-2xl" role="search">
              <div className="group relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                  className="w-full rounded-2xl border-0 bg-white pl-12 pr-6 py-3.5 text-base text-gray-900 shadow-lg shadow-emerald-900/20 placeholder:text-gray-400 focus:ring-4 focus:ring-emerald-500/40 focus:shadow-xl"
                />
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/search?q="
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-900/25 hover:bg-emerald-50 hover:shadow-xl transition-all"
              >
                {t("discover")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition-colors"
              >
                {t("sellNow")}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-sm text-emerald-50">
              <span className="inline-flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                {t("featFastTitle")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                {t("featSecureTitle")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Headphones className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                {t("featSupportTitle")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BannersCarousel />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("browseCategories")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("browseSubtitle")}</p>
          </div>
          <Link href="/search" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
            {t("seeAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {categories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              count={category.products_count}
              selected={false}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t("hotDeals")}</h2>
              <p className="text-sm text-gray-600">{t("hotDealsSubtitle")}</p>
            </div>
          </div>
          <Link href="/search?sort=rating" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
            {t("seeAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          {hotDeals.map((product) => (
            <ProductCard key={product.id} product={product} badge={t("badgeTop")} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t("popular")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("popularSubtitle")}</p>
          </div>
          <Link href="/search" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
            {t("seeAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
          {popular.map((product) => (
            <ProductCard key={product.id} product={product} badge={t("badgePopular")} />
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">{t("whyTitle")}</h2>
            <p className="mt-2 text-gray-600">{t("whySubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="group relative rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-gray-900/5"
                >
                  <div
                    className={`mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} transition-transform group-hover:scale-105`}
                  >
                    <Icon className={`h-7 w-7 ${feature.color}`} aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{t(feature.label)}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{t(feature.description)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}