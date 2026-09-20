"use client";

import { useState } from "react";
import Link from "next/link";
import { Headphones, Loader2, Send } from "lucide-react";
import { submitSupport } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ContactPage() {
  const { user, loading } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSent(null);
    try {
      const result = await submitSupport({
        subject: subject.trim() || undefined,
        message: message.trim(),
        phone: phone.trim() || undefined,
      });
      setSent(`${result.ticket} — ${result.message}`);
      setSubject("");
      setMessage("");
      setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
        <Headphones className="h-7 w-7 text-blue-700" />
        Contact
      </h1>
      <p className="mt-2 text-gray-600">
        Une question, un souci avec une commande ? Écrivez-nous, un conseiller vous
        répondra au plus vite.
      </p>
      <ul className="mt-4 space-y-1 text-sm text-gray-600">
        <li>support@yaxantu.com</li>
        <li>+237 6XX XXX XXX</li>
        <li>Douala, Cameroun</li>
      </ul>

      {sent && (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {sent}
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex justify-center text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : !user ? (
        <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
          <p className="text-sm">
            Connectez-vous pour contacter notre équipe d&apos;aide.
          </p>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Se connecter
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objet</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Demande d'information, problème de commande…"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Décrivez votre demande…"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}