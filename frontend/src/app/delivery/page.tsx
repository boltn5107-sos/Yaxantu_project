"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  getCourierOnboarding,
  getCourierJobs,
  setCourierAvailability,
  courierPickup,
  courierDeliver,
  type CourierJob,
  type CourierProgress,
} from "@/lib/api";
import {
  Bike,
  Clock,
  Loader2,
  CheckCircle2,
  PackageOpen,
  Phone,
  MapPin,
  Camera,
  Coins,
} from "lucide-react";

export default function DeliveryPage() {
  const { user, refresh } = useAuth();
  const [progress, setProgress] = useState<CourierProgress | null>(null);
  const [jobs, setJobs] = useState<CourierJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [deliveryActionsOpen, setDeliveryActionsOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, j] = await Promise.all([getCourierOnboarding(), getCourierJobs()]);
      setProgress(p);
      setJobs(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger votre espace livreur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCourierOnboarding(), getCourierJobs()])
      .then(([p, j]) => {
        if (cancelled) return;
        setProgress(p);
        setJobs(j);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Impossible de charger votre espace livreur.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleAvailability = async () => {
    if (!progress) return;
    setBusy("availability");
    setError(null);
    try {
      await setCourierAvailability(!progress.available);
      setProgress({ ...progress, available: !progress.available });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de changer votre disponibilité.");
    } finally {
      setBusy(null);
    }
  };

  const pickup = async (deliveryId: number) => {
    setBusy(`pickup-${deliveryId}`);
    setError(null);
    try {
      await courierPickup(deliveryId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Récupération impossible.");
    } finally {
      setBusy(null);
    }
  };

  const deliver = async (deliveryId: number, received: boolean) => {
    setBusy(`deliver-${deliveryId}`);
    setError(null);
    try {
      await courierDeliver(deliveryId, { proof: proof ?? undefined, received });
      setProof(null);
      setProofPreview(null);
      setDeliveryActionsOpen(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user?.courier && !(user?.roles ?? []).includes("delivery")) {
    return (
      <StandaloneNotice
        title="Devenir livreur"
        text="Choisissez le profil Livreur pour recevoir des courses et gagner en livrant."
        href="/auth/register"
        cta="Commencer"
      />
    );
  }

  if (progress && !progress.is_onboarded) {
    return (
      <StandaloneNotice
        title="Finissez votre inscription"
        text="Complétez vos 4 étapes pour commencer à recevoir des courses."
        href="/delivery/onboarding"
        cta="Reprendre l'inscription"
      />
    );
  }

  if (progress && progress.status === "pending") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Quelques heures d&apos;attente</h1>
        <p className="mt-2 text-sm text-gray-600">
          Votre demande d&apos;inscription a bien été reçue. Nous vous confirmons par SMS ou appel
          vocal sous {progress.review_hours} h.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white">
          <Bike className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Espace livreur</h1>
          <p className="text-sm text-gray-600">Vos courses, vos revenus.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div
        className={`mb-6 flex items-center justify-between rounded-2xl border p-6 ${
          progress?.available
            ? "border-emerald-200 bg-emerald-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-gray-900">
            {progress?.available ? "Vous êtes disponible" : "Vous êtes hors service"}
          </p>
          <p className="text-sm text-gray-600">
            {progress?.available
              ? "Les nouvelles courses peuvent vous être attribuées."
              : "Passez disponible pour recevoir des courses."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void toggleAvailability()}
          className={`relative inline-flex h-9 w-[4.5rem] shrink-0 items-center rounded-full transition-colors ${
            progress?.available ? "bg-emerald-500" : "bg-gray-300"
          }`}
          aria-pressed={progress?.available ?? false}
        >
          <span
            className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${
              progress?.available ? "translate-x-10" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Mes courses</h2>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center text-gray-500">
          Aucune course pour le moment. Quand une commande est expédiée dans votre zone,
          elle apparaît ici.
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.delivery_id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{job.order_number}</span>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                      {jobStatusLabel(job.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {job.items.map((i) => `${i.name} ×${i.quantity}`).join(" · ")}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  Attribuée le{" "}
                  {job.assigned_at ? new Date(job.assigned_at).toLocaleTimeString("fr-FR") : "—"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    À récupérer chez
                  </p>
                  <p className="text-sm font-medium text-gray-900">{job.seller}</p>
                  <a href={`tel:${job.seller_phone}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                    <Phone className="h-3.5 w-3.5" />
                    {job.seller_phone}
                  </a>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    À livrer à
                  </p>
                  <p className="text-sm font-medium text-gray-900">{job.buyer}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <a href={`tel:${job.buyer_phone}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                      <Phone className="h-3.5 w-3.5" />
                      {job.buyer_phone}
                    </a>
                  </div>
                  {job.address && (
                    <p className="mt-1 inline-flex items-start gap-1 text-xs text-gray-600">
                      <MapPin className="h-3 w-3 shrink-0 translate-y-0.5" />
                      {job.address.city}
                    </p>
                  )}
                </div>
              </div>

              {job.status === "assigned" && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void pickup(job.delivery_id)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                >
                  {busy === `pickup-${job.delivery_id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageOpen className="h-4 w-4" />
                  )}
                  J&apos;ai récupéré le colis
                </button>
              )}

              {(job.status === "picked_up" || job.status === "out_for_delivery") && (
                <div className="mt-4 space-y-3">
                  {deliveryActionsOpen === job.delivery_id ? (
                    <div className="rounded-xl border border-gray-200 p-3">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Photo comme preuve (facultatif)
                      </label>
                      {proofPreview ? (
                        <div className="relative mb-3 overflow-hidden rounded-xl border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proofPreview}
                            alt="Preuve de livraison"
                            className="h-40 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setProof(null);
                              setProofPreview(null);
                            }}
                            className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black/80"
                          >
                            Reprendre
                          </button>
                        </div>
                      ) : (
                        <label className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 py-6 text-gray-500 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                          <Camera className="h-6 w-6" />
                          <span className="text-xs font-medium">Prendre une photo du colis remis</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setProof(file);
                              setProofPreview(URL.createObjectURL(file));
                            }}
                          />
                        </label>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void deliver(job.delivery_id, true)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busy === `deliver-${job.delivery_id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Client a reçu
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryActionsOpen(null)}
                          className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setDeliveryActionsOpen(job.delivery_id)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <Camera className="h-4 w-4" />
                      Confirmer la livraison
                    </button>
                  )}
                  {job.status === "picked_up" && (
                    <p className="text-center text-xs text-gray-500">
                      Colis récupéré — en route !
                    </p>
                  )}
                </div>
              )}

              {job.status === "in_transit" && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  En cours de livraison.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function jobStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    assigned: "À récupérer",
    picked_up: "Colis récupéré",
    out_for_delivery: "En livraison",
    in_transit: "En route",
  };
  return labels[status] ?? status;
}

function StandaloneNotice({
  title,
  text,
  href,
  cta,
}: {
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
        <Bike className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">{text}</p>
      <Link
        href={href}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700"
      >
        {cta}
      </Link>
    </div>
  );
}