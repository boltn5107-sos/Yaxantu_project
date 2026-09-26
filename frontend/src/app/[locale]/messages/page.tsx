"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageCircle, Inbox, Forward } from "lucide-react";
import {
  getConversations,
  mediaUrl,
  type ConversationSummary,
} from "@/lib/api";
import { translateMessage } from "@/lib/glossary";

export default function MessagesPage() {
  const t = useTranslations("messages");
  const locale = useLocale();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      getConversations()
        .then((result) => {
          if (cancelled) return;
          setConversations(result);
        })
        .catch(() => {
          if (!cancelled) setConversations([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    const timer = window.setInterval(run, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-600">{t("subtitle")}</p>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
          <Inbox className="mx-auto h-10 w-10 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            {t("emptyTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t("emptyHint")}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {t("browseMarket")}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              {conversation.partner.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(conversation.partner.avatar) ?? ""}
                  alt={conversation.partner.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <MessageCircle className="h-5 w-5 text-emerald-700" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-gray-900">
                    {conversation.partner.name}
                  </p>
                  <span className="shrink-0 text-xs text-gray-400">
                    {conversation.last_message?.created_at
                      ? new Date(conversation.last_message.created_at).toLocaleTimeString(
                          locale,
                          { hour: "2-digit", minute: "2-digit" },
                        )
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-gray-500">
                    {conversation.last_message
                      ? conversation.last_message.kind === "voice"
                        ? t("voiceNote")
                        : conversation.last_message.from_me
                          ? t("youPrefix", {
                              text: conversation.last_message.text ?? "",
                            })
                          : (() => {
                              const text = conversation.last_message.text ?? "";
                              return translateMessage(text, locale)?.translated ?? text;
                            })()
                      : t("newConversation")}
                  </p>
                  {conversation.unread_count > 0 && (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
              <Forward className="h-4 w-4 shrink-0 text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}