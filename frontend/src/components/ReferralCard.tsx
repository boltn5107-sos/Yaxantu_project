"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, Copy, Check, Loader2, Users } from "lucide-react";
import { getReferral, type ReferralData } from "@/lib/api";

export default function ReferralCard() {
  const t = useTranslations("referral");
  const [data, setData] = useState<ReferralData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    getReferral()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("unavailable")),
      );
  }, [t]);

  const copy = async (text: string, onDone: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    onDone(true);
    setTimeout(() => onDone(false), 2000);
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gray-900 p-5 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
          <Gift className="h-4 w-4" />
          {data.reward_message}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="rounded-lg bg-white/10 px-3 py-2 text-base font-mono font-bold tracking-widest">
            {data.code}
          </code>
          <button
            type="button"
            onClick={() => void copy(data.code, setCopiedCode)}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            {copiedCode ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> {t("copied")}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> {t("copy")}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-2 text-gray-700">
          <Users className="h-4 w-4 text-gray-500" />
          {t("invited", { count: data.invited_count })}
        </span>
        <span className="font-semibold text-gray-900">{data.invited_count}</span>
      </div>

      {data.reward_codes.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t("rewardCodes")}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.reward_codes.map((code) => (
              <code key={code} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-mono font-semibold text-emerald-800">
                {code}
              </code>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          {t("inviteLink")}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={data.link}
            className="flex-1 min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700"
          />
          <button
            type="button"
            onClick={() => void copy(data.link, setCopiedLink)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" /> {t("copied")}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> {t("copy")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}