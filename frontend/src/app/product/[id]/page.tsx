"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  ShoppingCart,
  Heart,
  Truck,
  Shield,
  ChevronRight,
  Store,
  BadgeCheck,
  Check,
  Loader2,
  MessageCircle,
} from "lucide-react";
import {
  getProduct,
  getFavorites,
  addToCart,
  addFavorite,
  removeFavorite,
  getProductReviews,
  submitReview,
  type Product,
  type Review,
  type ApiError,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { formatPrice, fallbackImage } from "@/lib/utils";

type Tab = "description" | "specifications" | "reviews";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = use(params);

  const { data: product, loading, error } = useApi(
    () => getProduct(slug),
    [slug],
    null as Product | null,
  );

  const notFound =
    Boolean(error) && (error as { status?: number } | null)?.status === 404;

  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [selectedImage, setSelectedImage] = useState(0);

  const router = useRouter();
  const { user } = useAuth();

  const { data: favoriteProducts } = useApi<Product[]>(
    async () => (user ? getFavorites() : Promise.resolve([])),
    [user?.id],
    [],
  );

  const {
    data: reviews,
    loading: reviewsLoading,
    error: reviewsError,
  } = useApi<Review[]>(() => getProductReviews(slug), [slug], []);

  const [addedToCart, setAddedToCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    content: "",
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const isFavorite = Boolean(
    product && favoriteProducts.some((p) => p.id === product.id),
  );

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      router.push("/auth/login?next=/product/" + product.slug);
      return;
    }
    if (addingToCart || addedToCart) return;
    setAddingToCart(true);
    try {
      await addToCart(product.id, 1);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 1500);
    } catch {
      // silencieux
    } finally {
      setAddingToCart(false);
    }
  };

  const toggleFavorite = async () => {
    if (!product) return;
    if (!user) {
      router.push("/auth/login?next=/product/" + product.slug);
      return;
    }
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await removeFavorite(product.id);
      } else {
        await addFavorite(product.id);
      }
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      // silencieux
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!user) {
      router.push("/auth/login?next=/product/" + product.slug);
      return;
    }
    setReviewSubmitting(true);
    setReviewMsg(null);
    setReviewError(null);
    try {
      await submitReview(product.slug, reviewForm);
      setReviewMsg("Merci pour votre avis. Il sera publié après modération.");
      setReviewForm({ rating: 5, title: "", content: "" });
    } catch (err) {
      const apiErr = err as ApiError;
      setReviewError(
        apiErr.errors?.rating?.[0] ??
          apiErr.errors?.content?.[0] ??
          (err instanceof Error ? err.message : "Erreur réseau."),
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-4 w-48 rounded bg-gray-200 animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="h-96 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="h-6 w-1/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-10 w-1/2 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-blue-700 transition-colors">Accueil</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Produit introuvable</span>
        </nav>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-16 text-center">
          <p className="text-lg font-medium text-gray-900">Ce produit n&apos;est plus disponible.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Spécifications" },
    { id: "reviews", label: `Avis (${product.rating_count})` },
  ];

  const images =
    product.images.length > 0
      ? product.images.map((img) => img.path)
      : [fallbackImage(600, 400, product.id)];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/" className="hover:text-blue-700 transition-colors">Accueil</Link>
        <ChevronRight className="h-4 w-4" />
        {product.category && (
          <>
            <Link href={`/category/${product.category.slug}`} className="hover:text-blue-700 transition-colors">
              {product.category.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[selectedImage] ?? images[0]}
              alt={product.name}
              className="h-80 w-full object-cover sm:h-96"
            />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-3">
              {images.slice(0, 3).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`overflow-hidden rounded-xl border-2 transition-colors ${
                    selectedImage === idx ? "border-blue-600" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(product.rating_average)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating_average} ({product.rating_count} avis)
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-gray-900">{formatPrice(product.price)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Truck className="h-5 w-5 text-blue-700" />
              <div>
                <p className="text-sm font-medium text-gray-900">Livraison rapide</p>
                <p className="text-xs text-gray-600">2-3 jours ouvrables</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Shield className="h-5 w-5 text-emerald-700" />
              <div>
                <p className="text-sm font-medium text-gray-900">Garantie 12 mois</p>
                <p className="text-xs text-gray-600">Retour sous 7 jours</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => void handleAddToCart()}
              disabled={addingToCart || !product.in_stock}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {addedToCart ? (
                <>
                  <Check className="h-5 w-5" />
                  Ajouté au panier
                </>
              ) : product.in_stock ? (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  Ajouter au panier
                </>
              ) : (
                "Rupture de stock"
              )}
            </button>
            <button
              onClick={() => void toggleFavorite()}
              disabled={favoriteBusy}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                isFavorite
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {favoriteBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              )}
              {isFavorite ? "Dans vos favoris" : "Ajouter aux favoris"}
            </button>
            <button
              type="button"
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "";
                const text = `Je vous recommande « ${product.name} » sur Yaxantu à ${formatPrice(product.price)} : ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Partager
            </button>
          </div>

          {product.seller && (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.seller.shop_name}</p>
                  {product.seller.verified && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Vendeur vérifié
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/seller/${product.seller.slug}`} className="text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
                Visiter la boutique
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="py-6">
          {activeTab === "description" && (
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
              {product.description ? (
                product.description.split("\n").map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>Aucune description disponible.</p>
              )}
            </div>
          )}
          {activeTab === "specifications" && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ...(product.short_description
                  ? [{ label: "Résumé", value: product.short_description }]
                  : []),
                ...(product.category
                  ? [{ label: "Catégorie", value: product.category.name }]
                  : []),
                {
                  label: "Disponibilité",
                  value: product.in_stock ? "En stock" : "Rupture de stock",
                },
                {
                  label: "Livraison",
                  value: product.requires_shipping ? "Oui" : "Non",
                },
              ].map((spec) => (
                <li key={spec.label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="font-medium">{spec.label} :</span> {spec.value}
                </li>
              ))}
            </ul>
          )}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-900">{product.rating_average}</p>
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < Math.round(product.rating_average) ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{product.rating_count} avis</p>
                </div>
                <div className="h-16 w-px bg-gray-200" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Les avis vérifiés aident la communauté à faire les bons choix.</p>
                </div>
              </div>

              {user ? (
                <form
                  onSubmit={handleSubmitReview}
                  className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
                >
                  <h3 className="text-sm font-semibold text-gray-900">
                    Laisser un avis
                  </h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setReviewForm((prev) => ({ ...prev, rating: r }))
                        }
                        aria-label={`${r} étoiles`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            r <= reviewForm.rating
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    value={reviewForm.title}
                    onChange={(e) =>
                      setReviewForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Titre de votre avis (optionnel)"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <textarea
                    value={reviewForm.content}
                    onChange={(e) =>
                      setReviewForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Votre avis sur ce produit..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {reviewMsg && (
                    <p className="text-sm text-emerald-700">{reviewMsg}</p>
                  )}
                  {reviewError && (
                    <p className="text-sm text-red-600">{reviewError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {reviewSubmitting && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Publier l&apos;avis
                  </button>
                </form>
              ) : (
                <Link
                  href={`/auth/login?next=/product/${product.slug}`}
                  className="block text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Connectez-vous pour laisser un avis
                </Link>
              )}

              {reviewsLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  Chargement des avis...
                </div>
              ) : reviewsError ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  Les avis sont momentanément indisponibles.
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
                  Aucun avis publié pour le moment. Soyez le premier à donner
                  votre avis !
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-gray-200 bg-white p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {review.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {review.author}
                            </p>
                            {review.is_verified_purchase && (
                              <p className="text-xs text-emerald-600">
                                Achat vérifié
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.title && (
                        <p className="mt-3 text-sm font-semibold text-gray-900">
                          {review.title}
                        </p>
                      )}
                      {review.content && (
                        <p className="mt-1 text-sm text-gray-600">
                          {review.content}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        {review.created_at
                          ? new Date(review.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : ""}
                      </p>
                      {review.reply?.content && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                            <Store className="h-3.5 w-3.5" />
                            Réponse du vendeur
                            {review.reply.author ? (
                              <span className="font-normal text-gray-400">
                                · {review.reply.author}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {review.reply.content}
                          </p>
                          {review.reply.created_at ? (
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(review.reply.created_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}