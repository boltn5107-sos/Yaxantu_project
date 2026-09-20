"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  MessageCircle,
  Send,
  Smartphone,
  AtSign,
  Twitter,
  Music2,
  Facebook,
  Share2,
} from "lucide-react";
import { SHARE_CHANNELS } from "@/lib/api";

type ChannelIcon =
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "messenger"
  | "telegram"
  | "x"
  | "sms";

const brandColor: Record<ChannelIcon, string> = {
  whatsapp: "bg-emerald-500",
  instagram: "bg-gradient-to-br from-amber-500 via-pink-500 to-purple-600",
  tiktok: "bg-gray-900",
  messenger: "bg-blue-500",
  telegram: "bg-sky-500",
  x: "bg-gray-800",
  sms: "bg-teal-600",
};

const brandIcons: Record<ChannelIcon, typeof Send> = {
  whatsapp: MessageCircle,
  instagram: AtSign,
  tiktok: Music2,
  messenger: Facebook,
  telegram: Send,
  x: Twitter,
  sms: Smartphone,
};

export function buildShareMessage(shopName: string, link: string): string {
  return `Découvrez ma boutique ${shopName} sur Yaxantu : ${link}`;
}

export default function ShopShare({
  shopName,
  link,
  onShare,
}: {
  shopName: string;
  link: string;
  onShare?: (channel: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const message = buildShareMessage(shopName, link);
  const enc = encodeURIComponent;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    onShare?.("copy");
    setTimeout(() => setCopied(false), 2000);
  };

  const openChannel = (channel: ChannelIcon) => {
    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${enc(message)}`, "_blank", "noopener");
    } else if (channel === "telegram") {
      window.open(
        `https://t.me/share/url?url=${enc(link)}&text=${enc(message)}`,
        "_blank",
        "noopener",
      );
    } else if (channel === "x") {
      window.open(
        `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(link)}`,
        "_blank",
        "noopener",
      );
    } else if (channel === "sms") {
      const anchor = document.createElement("a");
      anchor.href = `sms:?&body=${enc(message)}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } else if (navigator.share) {
      navigator.share({ text: message, url: link }).catch(() => undefined);
    } else {
      copyLink();
      return;
    }
    onShare?.(channel);
  };

  const channelById = (id: string) =>
    (SHARE_CHANNELS.find((c) => c.id === id)?.id ?? "whatsapp") as ChannelIcon;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {SHARE_CHANNELS.map((channel) => {
          const key = channelById(channel.id);
          const Icon = brandIcons[key];
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => openChannel(key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white ${brandColor[key]} hover:opacity-90 transition-opacity`}
            >
              <Icon className="h-4 w-4" />
              {channel.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Copié !
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copier le lien
            </>
          )}
        </button>
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
        <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Votre boutique est publique : toute personne qui ouvre ce lien est
        comptée comme visite.
      </p>
    </div>
  );
}