"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Store,
  Loader2,
  Rocket,
  ImagePlus,
  X,
  ChevronLeft,
} from "lucide-react";
import {
  getCategories,
  createSellerProduct,
  type ApiError,
  type Category,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";

type Preview = { url: string; file: File };

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: categories } = useApi(
    () => getCategories(),
    [],
    [] as Category[],
  );

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [shipping, setShipping] = useState("");
  const [description, setDescription] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onboarded = user?.seller?.is_onboarded === true;

  if (user && user.seller && !onboarded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <Store className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Une boutique est nécessaire
        </h1>
        <p className="mt-2 text-gray-600">
          Un produit appartient toujours à une boutique (confiance, paiements,
          livraison). Créez la vôtre d&apos;abord.
        </p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Rocket className="h-4 w-4" />
          Créer ma boutique
        </Link>
      </div>
    );
  }

  const pickImages = (files: FileList | null) => {
    if (!files) return;
    const next = [...previews];
    for (const file of Array.from(files)) {
      if (next.length >= 6) break;
      next.push({ url: URL.createObjectURL(file), file });
    }
    setPreviews(next);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (submitting) return;
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Indiquez le nom du produit.");
      return;
    }
    const priceValue = Number(price);
    if (!priceValue || priceValue < 50) {
      setErrorMessage("Indiquez un prix valide (minimum 50 FCFA).");
      return;
    }

    const form = new FormData();
    form.append("name", name.trim());
    form.append("category_id", categoryId);
    form.append("price_minor", String(priceValue));
    form.append("stock_quantity", String(Number(stock) || 0));
    form.append("requires_shipping", String(true));
    if (shipping) form.append("shipping_rate_minor", String(Number(shipping) || 0));
    if (description.trim()) form.append("description", description.trim());
    previews.forEach((preview) => form.append("images[]", preview.file));

    setSubmitting(true);
    try {
      await createSellerProduct(form);
      router.push("/seller/products");
    } catch (err) {
      const apiErr = err as ApiError;
      const first = apiErr.errors ? Object.values(apiErr.errors)[0]?.[0] : null;
      setErrorMessage(first ?? apiErr.message ?? "Erreur pendant l&apos;enregistrement.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ajouter un produit</h1>
          <p className="text-gray-600">
            Il sera publié sur votre boutique dès sa création.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-900">
            Nom du produit <span className="text-rose-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Pagne wax 6 yards"
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900">
            Catégorie <span className="text-rose-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choisir une catégorie…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900">
              Prix (FCFA) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={50}
              step={50}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex : 12 000"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900">
              Stock
            </label>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Quantité"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900">
            Frais de livraison (FCFA) — optionnel
          </label>
          <input
            type="number"
            min={0}
            step={50}
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            placeholder="Laisser vide : offerte"
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Cette somme s&apos;ajoute au prix quand l&apos;acheteur choisit une
            livraison à domicile.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Décrivez votre produit, ses matières, tailles disponibles…"
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-900">
            Photos (jusqu&apos;à 6)
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              pickImages(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ImagePlus className="h-4 w-4" />
            Choisir des photos
          </button>
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={`Photo ${index + 1}`}
                    className="h-20 w-20 rounded-xl object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white shadow"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {errorMessage && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              Publier le produit
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        Commission marketplace appliquée à chaque vente : consultez vos
        finances pour le détail.
      </p>
    </div>
  );
}