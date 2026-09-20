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
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad",
];

export function fallbackImage(width: number, height: number, seed = 0): string {
  const base = FALLBACK_IMAGES[seed % FALLBACK_IMAGES.length];
  return `${base}?auto=format&fit=crop&w=${width}&h=${height}&q=60`;
}
