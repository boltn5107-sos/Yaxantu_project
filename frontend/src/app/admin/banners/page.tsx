"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { getAdminBanners, createAdminBanner, updateAdminBanner, deleteAdminBanner, type AdminBanner } from "@/lib/api";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ title: "", image_url: "", link: "" });

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
        setError(err instanceof Error ? err.message : "Impossible de charger les bannières.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const toggleActive = async (banner: AdminBanner) => {
    setBusy(`active-${banner.id}`);
    setError(null);
    setNotice(null);
    try {
      setNotice(
        await updateAdminBanner(banner.id, {
          title: banner.title,
          subtitle: banner.subtitle ?? undefined,
          image_url: banner.image ?? "",
          link: banner.link ?? undefined,
          sort_order: banner.sort_order,
          is_active: !banner.is_active,
        }),
      );
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (banner: AdminBanner) => {
    if (!window.confirm("Supprimer cette bannière ?")) return;
    setBusy(`delete-${banner.id}`);
    setError(null);
    setNotice(null);
    try {
      setNotice(await deleteAdminBanner(banner.id));
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.image_url) return;
    setBusy("create");
    setError(null);
    setNotice(null);
    try {
      setNotice(await createAdminBanner({ title: form.title, image_url: form.image_url, link: form.link || undefined, is_active: true }));
      setForm({ title: "", image_url: "", link: "" });
      setShowForm(false);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bannières</h1>
          <p className="text-sm text-gray-600">Bannières affichées sur la page d&apos;accueil.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Nouvelle bannière
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Titre *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">URL image *</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              required
              placeholder="https://..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Lien au clic</label>
            <input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/categories/x ou https://..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy === "create"}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === "create" && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer
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
          Aucune bannière. Créez la première !
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <img src={banner.image ?? ""} alt={banner.title ?? "Bannière"} className="h-36 w-full object-cover" />
              <div className="space-y-2 p-4">
                <p className="truncate font-medium text-gray-900">{banner.title}</p>
                {banner.link && <p className="truncate text-xs text-gray-500">{banner.link}</p>}
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
                    {banner.is_active ? "Active" : "Inactive"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === `delete-${banner.id}`}
                    onClick={() => void handleDelete(banner)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}