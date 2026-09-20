"use client";

import { useState } from "react";
import Link from "next/link";
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
import CategoryCard from "@/components/CategoryCard";
import ProductCard from "@/components/ProductCard";

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
    thumbnail: "/api/placeholder/400/300",
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
    title: "Livraison Rapide",
    description: "Recevez vos commandes en 2-3 jours ouvrables partout au Cameroun.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Shield,
    title: "Paiement Sécurisé",
    description: "Transactions protégées et vérification des vendeurs pour votre tranquillité.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Headphones,
    title: "Support 24/7",
    description: "Notre équipe est disponible à tout moment pour vous accompagner.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

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
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur mb-6">
              <TrendingUp className="h-3.5 w-3.5" />
              +2 500 nouveaux produits cette semaine
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              Achetez et vendez facilement en Afrique
            </h1>
            <p className="mt-6 text-lg text-blue-100 leading-relaxed max-w-2xl">
              La marketplace moderne qui connecte acheteurs et vendeurs à travers tout le continent.
              Simple, sûr et accessible à tous.
            </p>

            <div className="mt-8 max-w-2xl">
              <Link
                href={`/search?q=${encodeURIComponent(searchQuery)}`}
                className="relative block"
              >
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un produit, un vendeur, une marque..."
                  className="w-full rounded-2xl border-0 bg-white pl-12 pr-6 py-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:ring-4 focus:ring-blue-500/30"
                />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Découvrir les produits
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/seller"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition-colors"
              >
                Vendre maintenant
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Parcourir par catégorie</h2>
            <p className="mt-1 text-sm text-gray-600">Trouvez exactement ce dont vous avez besoin.</p>
          </div>
          <Link href="/search" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <h2 className="text-2xl font-bold text-gray-900">Offres du moment</h2>
              <p className="text-sm text-gray-600">Les meilleures affaires sélectionnées pour vous.</p>
            </div>
          </div>
          <Link href="/search?sort=rating" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotDeals.map((product) => (
            <ProductCard key={product.id} product={product} badge="Top" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Produits populaires</h2>
            <p className="mt-1 text-sm text-gray-600">Les articles les plus appréciés par notre communauté.</p>
          </div>
          <Link href="/search" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {popular.map((product) => (
            <ProductCard key={product.id} product={product} badge="Populaire" />
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Pourquoi choisir Yaxantu ?</h2>
            <p className="mt-2 text-gray-600">Une expérience d&apos;achat et de vente unique en Afrique.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="relative rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center transition-all hover:shadow-md">
                  <div className={`mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg}`}>
                    <Icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}