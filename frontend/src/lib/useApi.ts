"use client";

import { useEffect, useState } from "react";

/**
 * Petit hook de chargement unique (client) avec repli sur des données
 * statiques quand l'API est injoignable (dégradation gracieuse).
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  fallback: T,
): { data: T; error: string | null; errorStatus: number | null; loading: boolean } {
  const [data, setData] = useState<T>(fallback);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const apiErr = err as Error & { status?: number };
          setError(apiErr.message ?? "Erreur réseau.");
          setErrorStatus(apiErr.status ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, errorStatus, loading };
}