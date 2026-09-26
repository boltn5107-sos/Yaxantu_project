export type CategoryTranslator = {
  (key: string): string;
  has: (key: string) => boolean;
};

// Retourne le nom de catégorie traduit (catalogue « categories » clé par slug),
// avec repli sur le nom renvoyé par l'API pour les catégories inconnues.
export function categoryName(
  tCategories: CategoryTranslator,
  fallback: string,
  slug?: string | null,
): string {
  if (slug && tCategories.has(slug)) {
    return tCategories(slug);
  }
  return fallback;
}