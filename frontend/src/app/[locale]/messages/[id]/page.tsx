"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  Loader2,
  Mic,
  Send,
  Square,
  Trash2,
} from "lucide-react";
import {
  getConversation,
  sendChatTextMessage,
  sendChatVoiceMessage,
  mediaUrl,
  type ChatMessage as ChatMessageType,
  type ConversationThread,
} from "@/lib/api";

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations("messages");
  const tc = useTranslations("chat");
  const conversationId = Number(params.id);

  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      getConversation(conversationId)
        .then((result) => {
          if (cancelled) return;
          setThread(result);
        })
        .catch(() => {
          if (!cancelled) setError(t("notFound"));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    run();
    const timer = window.setInterval(run, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollBottom();
  }, [thread?.messages.length]);

  const sendText = async () => {
    const value = text.trim();
    if (!value || sending || recording) return;
    setSending(true);
    setText("");
    const previous = thread;
    setThread((t) =>
      t
        ? {
            ...t,
            messages: [
              ...t.messages,
              {
                id: -Date.now(),
                kind: "text",
                text: value,
                voice: null,
                from_me: true,
                created_at: new Date().toISOString(),
              } satisfies ChatMessageType,
            ],
          }
        : t,
    );
    try {
      await sendChatTextMessage(conversationId, value);
      scrollBottom();
    } catch {
      setText(value);
      setThread(previous);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) parts.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(parts, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) {
          void sendVoice(blob);
        }
      };
      chunks.splice?.(0, chunks.length);
      setChunks(parts);
      rec.start();
      setRecording(true);
    } catch {
      setError(tc("micUnavailable"));
    }
  };

  const stopRecording = () => {
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.stop();
    }
    setRecording(false);
  };

  const sendVoice = async (blob: Blob) => {
    setSending(true);
    try {
      await sendChatVoiceMessage(conversationId, blob);
      scrollBottom();
    } catch {
      setError(tc("voiceFailed"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-gray-600">
        {error}
      </div>
    );
  }

  if (!thread) return null;

  const { partner } = thread.conversation;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
      <Link
        href="/messages"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {/* En-tête du fil */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          {partner.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(partner.avatar) ?? ""}
              alt={partner.name}
              className="h-10 w-10 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Mic className="h-4 w-4 text-emerald-700" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{partner.name}</p>
            <p className="text-xs text-gray-500">
              {partner.role === "seller" ? t("roleShop") : t("roleBuyer")}
            </p>
          </div>
          {partner.href && (
            <Link
              href={partner.href}
              className="ml-auto text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              {t("viewShop")}
            </Link>
          )}
        </div>

        {/* Messages */}
        <div
          ref={listRef}
          className="flex max-h-[55vh] min-h-[40vh] flex-col gap-2 overflow-y-auto bg-gray-50 p-4"
        >
          {thread.messages.length === 0 && (
            <div className="m-auto text-center text-sm text-gray-400">
              {t("sayHello")}
            </div>
          )}
          {thread.messages.map((message) =>
            message.kind === "voice" ? (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                  message.from_me
                    ? "self-end rounded-br-md bg-emerald-600"
                    : "self-start rounded-bl-md bg-white border border-gray-200"
                }`}
              >
                {message.voice && (
                  <audio
                    controls
                    src={message.voice}
                    className="h-9 w-56 max-w-full"
                    preload="metadata"
                  />
                )}
              </div>
            ) : (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  message.from_me
                    ? "self-end rounded-br-md bg-emerald-600 text-white"
                    : "self-start rounded-bl-md bg-white text-gray-800 border border-gray-200"
                }`}
              >
                {message.text}
              </div>
            ),
          )}
        </div>

        {/* Saisie */}
        <div className="border-t border-gray-100 px-3 py-3">
          {error && (
            <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}
          <div className="flex items-center gap-2">
            {recording ? (
              <>
                <span className="mx-2 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                  {t("recording")}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  <Square className="h-4 w-4" />
                  {t("send")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (recRef.current && recRef.current.state !== "inactive") {
                      const rec = recRef.current;
                      rec.onstop = null;
                      rec.stop();
                      if (rec.stream) {
                        rec.stream.getTracks().forEach((track) => track.stop());
                      }
                    }
                    recRef.current = null;
                    setRecording(false);
                  }}
                  className="inline-flex items-center rounded-xl p-2.5 text-gray-500 hover:bg-gray-100"
                  aria-label={t("cancelAria")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  disabled={sending}
                  title={t("voiceAria")}
                  aria-label={t("voiceAria")}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-50 p-2.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendText();
                    }
                  }}
                  placeholder={t("inputPlaceholder")}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void sendText()}
                  disabled={sending || text.trim().length === 0}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 p-2.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                  aria-label={t("sendAria")}
                >
                  <Send className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}