"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/api";

const priorityColor: Record<string, string> = {
  high: "border-red-200 bg-red-50",
  normal: "border-gray-200 bg-white",
  low: "border-gray-100 bg-gray-50",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getNotifications()
      .then((result) => {
        if (cancelled) return;
        setItems(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Notifications indisponibles.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const markRead = async (id: number) => {
    setBusy(`read-${id}`);
    setError(null);
    try {
      await markNotificationRead(id);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  const markAll = async () => {
    setBusy("all");
    setError(null);
    try {
      await markAllNotificationsRead();
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  const unreadCount = items.filter((i) => !i.is_read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
            <Bell className="h-7 w-7 text-blue-700" />
            Notifications
          </h1>
          <p className="mt-1 text-gray-600">
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
              : "Tout est à jour."}
          </p>
        </div>
        <button
          type="button"
          disabled={unreadCount === 0 || busy === "all"}
          onClick={() => void markAll()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Tout marquer lu
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          <Bell className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          Aucune notification pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-2xl border p-4 ${priorityColor[item.priority] ?? priorityColor.normal} ${
                !item.is_read ? "ring-1 ring-blue-200" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold text-gray-900 ${item.is_read ? "" : "text-blue-700"}`}>
                    {item.title}
                  </p>
                  {item.message && <p className="mt-1 text-sm text-gray-600">{item.message}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    {item.created_at ? new Date(item.created_at).toLocaleString("fr-FR") : ""}
                  </p>
                </div>
                {!item.is_read && (
                  <button
                    type="button"
                    disabled={busy === `read-${item.id}`}
                    onClick={() => void markRead(item.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Marquer lu
                  </button>
                )}
              </div>
              {item.action_url && item.action_text && (
                <Link
                  href={item.action_url}
                  onClick={() => void (item.is_read ? null : markRead(item.id))}
                  className="mt-3 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  {item.action_text}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}