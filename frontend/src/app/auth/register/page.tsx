"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { register, landingPathFor, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const refCode = new URLSearchParams(window.location.search).get("ref");
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        phone: form.phone || undefined,
        ...(refCode ? { ref: refCode } : {}),
      });
      const me = await refresh();
      router.push(landingPathFor(me));
      router.refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr.status === 422
          ? Object.values(apiErr.errors ?? {})[0]?.[0] ??
              "Certains champs sont invalides."
          : err instanceof Error
            ? err.message
            : "Erreur réseau.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
              <User className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
            <p className="mt-1 text-sm text-gray-600">Rejoignez Yaxantu pour acheter ou vendre.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={(e) => void submit(e)}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <div className="relative">
                <input
                  value={form.name}
                  onChange={update("name")}
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Jean Dupont"
                />
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="jean@example.com"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <div className="relative">
                <input
                  value={form.phone}
                  onChange={update("phone")}
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="+237 6XX XXX XXX"
                />
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type="password"
                  value={form.password}
                  onChange={update("password")}
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <div className="relative">
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={update("password_confirmation")}
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              S&apos;inscrire
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{" "}
            <Link href="/auth/login" className="font-medium text-blue-700 hover:text-blue-800 transition-colors">
              Se connecter
            </Link>
          </p>

          <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
            <div className="h-px flex-1 bg-gray-200" />
            ou
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <Link href="/auth/phone?mode=register" className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2 11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            S&apos;inscrire avec le téléphone
          </Link>
        </div>
      </div>
    </div>
  );
}