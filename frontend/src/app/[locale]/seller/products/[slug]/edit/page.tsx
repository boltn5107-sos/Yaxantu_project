"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Package,
  Store,
  Loader2,
  Rocket,
  ImagePlus,
  Video,
  X,
  ChevronLeft,
  Save,
  Wrench,
} from "lucide-react";
import {
  getCategories,
  getSellerProducts,
  updateSellerProduct,
  mediaUrl,
  isVideoUrl,
  type ApiError,
  type Category,
  type SellerProduct,
} from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { categoryName } from "@/lib/categoryName";

type Preview = { url: string; file: File; kind: "image" | "video" };

function ProductEditForm({
  product,
  categories,
  onSaved,
}: {
  product: SellerProduct;
  categories: Category[];
  onSaved: (slug: string) => void;
}) {
  const t = useTranslations("seller");
  const ct = useTranslations("categories");
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(
    product.category ? String(product.category.id) : "",
  );
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock_quantity));
  const [description, setDescription] = useState(product.description ?? "");
  const [isActive, setIsActive] = useState(product.is_active);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const pickImages = (files: FileList | null) => {
    if (!files) return;
    const next = [...previews];
    for (const file of Array.from(files)) {
      if (next.length >= 6 - product.images.length) break;
      const kind = file.type.startsWith("video/") ? "video" : "image";
      next.push({ url: URL.createObjectURL(file), file, kind });
    }
    setPreviews(next);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickImages(e.target.files);
    e.target.value = "";
  };

  const submit = async () => {
    if (submitting) return;
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage(t("products.errors.nameRequired"));
      return;
    }
    const priceValue = Number(price);
    if (!priceValue || priceValue < 50) {
      setErrorMessage(t("products.errors.priceRequired"));
      return;
    }

    const fields: Record<string, unknown> = {
      name: name.trim(),
      category_id: Number(categoryId),
      price_minor: priceValue,
      stock_quantity: Number(stock) || 0,
      requires_shipping: true,
      description: description.trim() || null,
      is_active: isActive,
    };

    let payload: Record<string, unknown> | FormData = fields;
    if (previews.length > 0) {
      const form = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value === null) return;
        form.append(key, String(value));
      });
      previews.forEach((preview) => form.append("images[]", preview.file));
      payload = form;
    }

    setSubmitting(true);
    try {
      await updateSellerProduct(product.slug, payload);
      onSaved(product.slug);
    } catch (err) {
      const apiErr = err as ApiError;
      const first = apiErr.errors ? Object.values(apiErr.errors)[0]?.[0] : null;
      setErrorMessage(first ?? apiErr.message ?? t("products.errors.update"));
      setSubmitting(false);
    }
  };

  const totalPhotos = product.images.length + previews.length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-900">
          {t("products.form.nameLabel")} <span className="text-rose-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("products.form.namePlaceholder")}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900">
          {t("products.form.categoryLabel")} <span className="text-rose-500">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t("products.form.categoryPlaceholder")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {categoryName(ct, category.name, category.slug)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900">
            {t("products.form.priceLabel")} <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min={50}
            step={50}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("products.form.pricePlaceholder")}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900">
            {t("products.form.stockLabel")}
          </label>
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder={t("products.form.stockPlaceholder")}
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900">
          {t("products.form.descriptionLabel")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder={t("products.form.descriptionPlaceholder")}
          className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900">
          {t("products.form.mediaLabelCount", { total: totalPhotos, max: 6 })}
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          {product.images.map((image) =>
            image.kind === "video" || isVideoUrl(mediaUrl(image.path) ?? "") ? (
              <div key={image.id} className="relative">
                <video
                  src={mediaUrl(image.path) ?? ""}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-20 w-20 rounded-xl object-cover border border-gray-200"
                />
                <span className="absolute -right-2 -top-2 rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                  {t("products.form.videoBadge")}
                </span>
              </div>
            ) : (
              <div key={image.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl(image.path) ?? ""}
                  alt={product.name}
                  className="h-20 w-20 rounded-xl object-cover border border-gray-200"
                />
                <span className="absolute -right-2 -top-2 rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                  {t("products.form.currentBadge")}
                </span>
              </div>
            ),
          )}
          {previews.map((preview, index) => (
            <div key={index} className="relative">
              {preview.kind === "video" ? (
                <video
                  src={preview.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-20 w-20 rounded-xl object-cover border border-gray-200"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={t("products.form.photoAlt", { number: index + 1 })}
                  className="h-20 w-20 rounded-xl object-cover border border-gray-200"
                />
              )}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white shadow"
                aria-label={t("products.form.removeMedia")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => imageRef.current?.click()}
            disabled={totalPhotos >= 6}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            {t("products.form.addMedia")}
          </button>
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={totalPhotos >= 6}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Video className="h-4 w-4" />
            {t("products.form.chooseVideo")}
          </button>
        </div>
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <p className="mt-1 text-xs text-gray-500">
          {t("products.form.videoHint")}
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
        <input
          id="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label htmlFor="isActive" className="text-sm font-semibold text-gray-900">
          {t("products.form.published")}
        </label>
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("products.form.saving")}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            {t("products.form.saveChanges")}
          </>
        )}
      </button>
    </div>
  );
}

export default function EditProductPage() {
  const t = useTranslations("seller");
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user } = useAuth();

  const { data: categories } = useApi(
    () => getCategories(),
    [],
    [] as Category[],
  );
  const { data: products, loading, error: loadError } = useApi(
    () => getSellerProducts(),
    [slug],
    [] as SellerProduct[],
  );

  const product = products.find((p) => p.slug === slug);

  const onboarded = user?.seller?.is_onboarded === true;

  if (user && user.seller && !onboarded) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
          <Store className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          {t("products.gate.shopRequiredTitle")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("products.edit.gateDescription")}
        </p>
        <Link
          href="/seller/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Rocket className="h-4 w-4" />
          {t("products.gate.createShop")}
        </Link>
      </div>
    );
  }

  if (!user?.seller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Wrench className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {t("products.gate.sellerProfileTitle")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("products.gate.sellerProfileDescription")}
        </p>
        <Link
          href="/profile"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t("products.gate.chooseProfile")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Package className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">
          {t("products.edit.notFoundTitle")}
        </h1>
        <p className="mt-2 text-gray-600">
          {loadError ?? t("products.edit.notFoundDescription")}
        </p>
        <Link
          href="/seller/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t("products.edit.backToProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("products.form.back")}
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("products.edit.title")}
          </h1>
          <p className="text-gray-600">
            {t("products.edit.subtitle")}
          </p>
        </div>
      </div>

      <ProductEditForm
        product={product}
        categories={categories}
        onSaved={() => router.push("/seller/products")}
      />
    </div>
  );
}