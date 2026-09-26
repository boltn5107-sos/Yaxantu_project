import {
  Smartphone,
  Shirt,
  Home,
  Apple,
  Baby,
  Dumbbell,
  HeartPulse,
  BookOpen,
  Palette,
  Car,
  Cat,
  ShoppingBag,
  Camera,
  type LucideIcon,
} from "lucide-react";

const slugIconMap: Record<string, LucideIcon> = {
  electronique: Smartphone,
  "mode-beaute": Shirt,
  "maison-electromenager": Home,
  alimentation: Apple,
  "bebe-enfants": Baby,
  "sport-loisirs": Dumbbell,
  "sante-bien-etre": HeartPulse,
  "livres-papeterie": BookOpen,
  "artisanat-deco": Palette,
  "auto-motos": Car,
  animaux: Cat,
};

const nameIconMap: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  telephone: Smartphone,
  electronique: Smartphone,
  shirt: Shirt,
  vetement: Shirt,
  "mode-beaute": Shirt,
  "maison-electromenager": Home,
  home: Home,
  maison: Home,
  alimentation: Apple,
  grocery: Apple,
  alimentaire: Apple,
  "bebe-enfants": Baby,
  baby: Baby,
  "sport-loisirs": Dumbbell,
  sport: Dumbbell,
  "sante-bien-etre": HeartPulse,
  sante: HeartPulse,
  "livres-papeterie": BookOpen,
  books: BookOpen,
  livre: BookOpen,
  "artisanat-deco": Palette,
  deco: Palette,
  "auto-motos": Car,
  voiture: Car,
  animaux: Cat,
  animal: Cat,
  camera: Camera,
  photo: Camera,
  "paw-print": Cat,
  acheter: ShoppingBag,
  shopping: ShoppingBag,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoryIcon({
  slug,
  name,
  icon,
  className,
  fallback = ShoppingBag,
}: {
  slug?: string | null;
  name?: string | null;
  icon?: string | null;
  className?: string;
  fallback?: LucideIcon;
}) {
  const rawName = (icon ?? name ?? "").trim();
  const Icon =
    (slug ? slugIconMap[normalize(slug)] : undefined) ??
    (rawName ? nameIconMap[normalize(rawName)] : undefined) ??
    fallback;

  return <Icon className={className} aria-hidden="true" />;
}