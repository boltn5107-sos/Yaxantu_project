"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Lock, Loader2 } from "lucide-react";
import { login, landingPathFor, type ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function LoginContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({
        ...prev,
        [key]: key === "remember" ? e.target.checked : e.target.value,
      }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({
        email: form.email,
        password: form.password,
        remember: form.remember,
      });
      const me = await refresh();
      const next = searchParams.get("next");
      router.push(
        next?.startsWith("/")
          ? next
          : landingPathFor(me),
      );
      router.refresh();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr.status === 422
          ? (apiErr.errors?.email?.[0] ?? t("invalidCredentials"))
          : err instanceof Error
            ? err.message
            : t("networkError"),
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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
              <img
                src="/image/logo.png"
                alt="Taaba-taaba"
                className="h-14 w-14 rounded-2xl object-cover shadow-md"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t("loginTitle")}</h1>
            <p className="mt-1 text-sm text-gray-600">{t("loginSubtitle")}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={(e) => void submit(e)}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("emailLabel")}</label>
              <div className="relative">
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="jean@example.com"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("passwordLabel")}</label>
              <div className="relative">
                <input
                  type="password"
                  value={form.password}
                  onChange={update("password")}
                  className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={update("remember")}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                {t("rememberMe")}
              </label>
              <button type="button" className="text-emerald-700 hover:text-emerald-800 transition-colors">
                {t("forgotPassword")}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("loginSubmit")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            {t("noAccount")} {" "}
            <Link href="/auth/register" className="font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
              {t("registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}