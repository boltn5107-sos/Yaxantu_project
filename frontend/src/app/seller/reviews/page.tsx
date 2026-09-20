"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Loader2, MessageSquare, ExternalLink, Store } from "lucide-react";
import {
  getSellerReviews,
  replySellerReview,
  type SellerReview,
} from "@/lib/api";
import SellerOnboardingGate from "@/components/SellerOnboardingGate";

const statusFilter = [
  { value: "", label: "Tous les statuts" },
  { value: "approved", label: "Publiés" },
  { value: "pending", label: "En attente" },
  { value: "rejected", label: "Rejetés" },
];

const statusStyles: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
  hidden: "bg-gray-100 text-gray-600",
};

export default function SellerReviewsPage() {
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  const [status, setStatus] = useState("");
  const [withoutReply, setWithoutReply] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyReply, setBusyReply] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSellerReviews({
      status: status || undefined,
      with_reply: withoutReply ? false : undefined,
      page,
    })
      .then((result) => {
        if (cancelled) return;
        setReviews(result.data);
        setMeta(result.meta);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger les avis.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, withoutReply, page]);

  const reload = () => {
    void getSellerReviews({ status: status || undefined, with_reply: withoutReply ? false : undefined, page })
      .then((result) => {
        setReviews(result.data);
        setMeta(result.meta);
      })
      .catch(() => undefined);
  };

  const publishReply = (reviewId: number) => {
    const content = (drafts[reviewId] ?? "").trim();
    if (!content) return;
    setBusyReply(reviewId);
    setError(null);
    replySellerReview(reviewId, content)
      .then(() => {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[reviewId];
          return next;
        });
        reload();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Réponse impossible."))
      .finally(() => setBusyReply(null));
  };

  return (
    <SellerOnboardingGate>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Avis clients</h1>
            <p className="text-sm text-gray-600">
              Répondez publiquement aux avis pour rassurer vos futurs clients.
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {statusFilter.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={withoutReply}
              onChange={(e) => {
                setWithoutReply(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            Sans réponse
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
            Aucun avis dans cette liste. Les avis client apparaîtront ici.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const current = (drafts[review.id] ?? "") || review.reply?.content || "";
              return (
                <div key={review.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {review.author.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{review.author}</p>
                        {review.is_verified_purchase && (
                          <p className="text-xs text-emerald-600">Achat vérifié</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {review.title && (
                    <p className="mt-3 text-sm font-semibold text-gray-900">{review.title}</p>
                  )}
                  {review.content && <p className="mt-1 text-sm text-gray-600">{review.content}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>
                      {review.created_at
                        ? new Date(review.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                    {review.product && (
                      <Link
                        href={`/product/${review.product.slug}`}
                        className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {review.product.name}
                      </Link>
                    )}
                    <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                      statusStyles[review.status] ?? statusStyles.pending
                    }`}>
                      {review.status === "approved" ? "Publié" : review.status}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <Store className="h-3.5 w-3.5" />
                      Votre réponse
                    </div>
                    <textarea
                      value={current}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))
                      }
                      rows={3}
                      maxLength={2000}
                      placeholder="Répondez à cet avis (max. 2000 caractères)..."
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <div className="mt-2 flex items-center justify-end gap-3">
                      {review.reply && (
                        <span className="text-xs text-emerald-600">
                          Réponse publiée le{" "}
                          {review.reply.updated_at
                            ? new Date(review.reply.updated_at).toLocaleDateString("fr-FR")
                            : ""}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={busyReply === review.id || !current.trim()}
                        onClick={() => publishReply(review.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {busyReply === review.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5" />
                        )}
                        {review.reply ? "Mettre à jour" : "Publier la réponse"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && meta.last_page > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
            <span>
              Page {meta.current_page} sur {meta.last_page} · {meta.total} avis
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={meta.current_page <= 1}
                onClick={() => setPage(meta.current_page - 1)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage(meta.current_page + 1)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </SellerOnboardingGate>
  );
}