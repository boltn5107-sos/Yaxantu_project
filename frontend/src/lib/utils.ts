import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number): string {
  return `${priceFormatter.format(amount)} FCFA`;
}

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b",
  "https://images.unsplash.com/photo-1434389677669-e08b4cac3105",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
  "https://images.unsplash.com/photo-1610701596007-11502861dcfa",
  "https://images.unsplash.com/photo-1533900298318-6b8da08a523e",
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9",
  "https://images.unsplash.com/photo-1542838132-92c53300491e",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352",
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
];

function hashSeed(seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

export function fallbackImage(width: number, height: number, seed = 0): string {
  const base = FALLBACK_IMAGES[hashSeed(seed) % FALLBACK_IMAGES.length];
  return `${base}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}
