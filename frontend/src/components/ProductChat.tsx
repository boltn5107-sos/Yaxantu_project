"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, MessageCircle, Mic, Send, Square, Trash2, X } from "lucide-react";
import {
  startConversation,
  getConversation,
  sendChatTextMessage,
  sendChatVoiceMessage,
  mediaUrl,
  type ChatMessage as ChatMessageType,
  type ConversationThread,
} from "@/lib/api";

type ChatSeller = {
  id: number;
  shop_name: string;
  slug: string;
  logo: string | null;
};

type ChatProduct = {
  name: string;
  thumbnail: string | null;
};

export type ProductChatHandle = {
  startRecording: () => Promise<void>;
};

type ProductChatProps = {
  seller: ChatSeller;
  product: ChatProduct;
  open: boolean;
  onClose: () => void;
};

const ProductChat = forwardRef<ProductChatHandle, ProductChatProps>(
  function ProductChat({ seller, product, open, onClose }, ref) {
    const t = useTranslations("chat");
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [thread, setThread] = useState<ConversationThread | null>(null);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [recording, setRecording] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);

    const recRef = useRef<MediaRecorder | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const conversationPromiseRef = useRef<Promise<number> | null>(null);

    const ensureConversation = useCallback((): Promise<number> => {
      if (!conversationPromiseRef.current) {
        conversationPromiseRef.current = startConversation(seller.id).then(
          (conversation) => {
            setConversationId(conversation.id);
            return conversation.id;
          },
        );
      }
      return conversationPromiseRef.current;
    }, [seller.id]);

    const refreshConversation = useCallback(async (id: number) => {
      const result = await getConversation(id);
      setThread(result);
      setChatError(null);
    }, []);

    const scrollBottom = () => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    };

    useEffect(() => {
      if (!open) return;
      let cancelled = false;

      const run = () => {
        ensureConversation()
          .then(refreshConversation)
          .catch(() => {
            if (!cancelled) setChatError(t("notFound"));
          });
      };

      run();
      const timer = window.setInterval(run, 3000);

      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }, [open, ensureConversation, refreshConversation]);

    useEffect(() => {
      scrollBottom();
    }, [thread?.messages.length]);

    const sendVoice = async (blob: Blob) => {
      setSending(true);
      try {
        const id = await ensureConversation();
        await sendChatVoiceMessage(id, blob);
        await refreshConversation(id);
        scrollBottom();
      } catch {
        setChatError(t("voiceFailed"));
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
          setRecording(false);
          const blob = new Blob(parts, { type: rec.mimeType || "audio/webm" });
          if (blob.size > 0) {
            void sendVoice(blob);
          }
        };
        rec.start();
        setRecording(true);
      } catch {
        setChatError(t("micUnavailable"));
      }
    };

    const finishRecording = () => {
      if (recRef.current && recRef.current.state !== "inactive") {
        recRef.current.stop();
      }
    };

    const cancelRecording = () => {
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
    };

    const sendText = async () => {
      const value = text.trim();
      if (!value || sending || recording) return;
      setSending(true);
      setText("");
      const previous = thread;
      setThread((current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages,
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
          : current,
      );
      try {
        const id = await ensureConversation();
        await sendChatTextMessage(id, value);
        await refreshConversation(id);
      } catch {
        setText(value);
        setThread(previous);
      } finally {
        setSending(false);
      }
    };

    useImperativeHandle(ref, () => ({ startRecording }));

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          aria-label={t("closeDiscussion")}
          onClick={() => {
            cancelRecording();
            onClose();
          }}
          className="absolute inset-0 bg-gray-900/50"
        />
        <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[440px]">
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {product.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl(product.thumbnail) ?? ""}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <MessageCircle className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {product.name}
              </p>
              <p className="truncate text-xs text-gray-500">
                {t("discussionWith", { seller: seller.shop_name })}
              </p>
            </div>
            {conversationId && (
              <Link
                href={`/messages/${conversationId}`}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                {t("history")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                cancelRecording();
                onClose();
              }}
              className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label={t("close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-2 overflow-y-auto bg-gray-50 p-4"
          >
            {!thread && !chatError && (
              <div className="m-auto text-center text-sm text-gray-400">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                <p className="mt-2">{t("connecting")}</p>
              </div>
            )}
            {chatError && (
              <div className="m-auto text-center text-sm text-gray-500">
                {chatError}
              </div>
            )}
            {thread && thread.messages.length === 0 && (
              <div className="m-auto text-center text-sm text-gray-400">
                {t("askQuestion", { product: product.name })}
              </div>
            )}
            {thread?.messages.map((message) =>
              message.kind === "voice" ? (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    message.from_me
                      ? "self-end rounded-br-md bg-emerald-600"
                      : "self-start rounded-bl-md border border-gray-200 bg-white"
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
                      : "self-start rounded-bl-md border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  {message.text}
                </div>
              ),
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-3">
            {chatError && (
              <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {chatError}
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
                    onClick={finishRecording}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    <Square className="h-4 w-4" />
                    {t("send")}
                  </button>
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="inline-flex items-center rounded-xl p-2.5 text-gray-500 hover:bg-gray-100"
                    aria-label={t("cancel")}
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
                    title={t("voiceMessage")}
                    aria-label={t("voiceMessage")}
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
                    aria-label={t("send")}
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
  },
);

export default ProductChat;