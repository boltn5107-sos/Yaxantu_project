"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Image as ImageIcon, Loader2, Plus, Trash2, Eye, Pencil } from "lucide-react";
import {
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  mediaUrl,
  type AdminBanner,
} from "@/lib/api";

const emptyForm = {
  id: null as number | null,
  title: "",
  subtitle: "",
  imageMode: "upload" as "upload" | "url",
  image_url: "",
  imageFile: null as File | null,
  link: "",
  sort_order: 0,
  is_active: true,
};

export default function AdminBannersPage() {
  const t = useTranslations("admin");
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    getAdminBanners()
      .then((result) => {
        if (cancelled) return;
        setBanners(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("banners.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload, t]);

  const preview = useMemo(() => {
    if (form.imageFile) return URL.createObjectURL(form.imageFile);
    if (form.imageMode === "url" && form.image_url) return form.image_url;
    if (form.id !== null) {
      const existing = banners.find((b) => b.id === form.id);
      return existing?.image ?? null;
    }
    return null;
  }, [form.imageFile, form.imageMode, form.image_url, form.id, banners]);

  const openCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (banner: AdminBanner) => {
    setForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      imageMode: "upload",
      image_url: banner.image_url ?? "",
      imageFile: null,
      link: banner.link ?? "",
      sort_order: banner.sort_order,
      is_active: banner.is_active,
    });
    setShowForm(true);
  };

  const toggleActive = async (banner: AdminBanner) => {
    setBusy(`active-${banner.id}`);
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await updateAdminBanner(banner.id, {
          title: banner.title,
          subtitle: banner.subtitle ?? undefined,
          image_url: banner.image_url ?? "",
          link: banner.link ?? undefined,
          sort_order: banner.sort_order,
          is_active: !banner.is_active,
        }),
      );
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("banners.updateError"));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (banner: AdminBanner) => {
    if (!window.confirm(t("banners.deleteConfirm"))) return;
    setBusy(`delete-${banner.id}`);
    setError(null);
    setNotice(null);
    try {
      setNotice(await deleteAdminBanner(banner.id));
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("banners.deleteError"));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    if (!form.imageFile && form.imageMode === "url" && !form.image_url && form.id === null) return;

    setBusy("submit");
    setError(null);
    setNotice(null);
    const input = {
      title: form.title,
      subtitle: form.subtitle || undefined,
      link: form.link || undefined,
      sort_order: form.sort_order,
      is_active: form.is_active,
      image: form.imageFile ?? undefined,
      image_url: form.imageMode === "url" ? form.image_url || undefined : undefined,
    };
    try {
      setNotice(
        form.id === null
          ? await createAdminBanner(input)
          : await updateAdminBanner(form.id, input),
      );
      setForm(emptyForm);
      setShowForm(false);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("banners.saveError"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("banners.title")}</h1>
          <p className="text-sm text-gray-600">
            {t("banners.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          {t("banners.new")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {form.id === null ? t("banners.new") : t("banners.editTitle", { title: form.title })}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              {t("banners.close")}
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("banners.titleLabel")}</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("banners.subtitleLabel")}</label>
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("banners.imageLabel")}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imageMode: "upload" })}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    form.imageMode === "upload"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("banners.uploadImage")}
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, imageMode: "url" })}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    form.imageMode === "url"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t("banners.useUrl")}
                </button>
              </div>

              {form.imageMode === "upload" ? (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) =>
                    setForm({ ...form, imageFile: e.target.files?.[0] ?? null, image_url: "" })
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700 focus:border-emerald-500 focus:outline-none"
                />
              ) : (
                <input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value, imageFile: null })}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              )}

              {preview && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={t("banners.previewAlt")}
                    className="h-32 w-full object-cover rounded-xl border border-gray-200"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("banners.linkLabel")}</label>
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="/categories/x ou https://..."
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("banners.orderLabel")}</label>
                <input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("banners.statusLabel")}</label>
                <select
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="active">{t("banners.statusActive")}</option>
                  <option value="inactive">{t("banners.statusInactive")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy === "submit"}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy === "submit" && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.id === null ? t("banners.create") : t("banners.save")}
            </button>
          </div>
        </form>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
          <ImageIcon className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          {t("banners.empty")}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(banner.image) ?? ""} alt={banner.title ?? t("banners.imageAlt")} className="h-36 w-full object-cover" />
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-gray-900">{banner.title}</p>
                  {banner.link ? (
                    <a
                      href={banner.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                    >
                      <Eye className="h-3 w-3" />
                      {t("banners.open")}
                    </a>
                  ) : null}
                </div>
                {banner.subtitle && <p className="truncate text-xs text-gray-500">{banner.subtitle}</p>}
                <p className="text-xs text-gray-400">{t("banners.orderLine", { value: banner.sort_order })}</p>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={busy === `active-${banner.id}`}
                    onClick={() => void toggleActive(banner)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                      banner.is_active
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {banner.is_active ? t("banners.statusActive") : t("banners.statusInactive")}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(banner)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("banners.edit")}
                    </button>
                    <button
                      type="button"
                      disabled={busy === `delete-${banner.id}`}
                      onClick={() => void handleDelete(banner)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("banners.delete")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}