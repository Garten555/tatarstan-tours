/** Русские названия enum tour_category для UI. */
export const TOUR_CATEGORY_LABELS: Record<string, string> = {
  history: 'История',
  nature: 'Природа',
  culture: 'Культура',
  architecture: 'Архитектура',
  food: 'Гастрономия',
  gastronomy: 'Гастрономия',
  adventure: 'Приключения',
};

export function formatTourCategoryLabel(category: string | null | undefined): string {
  if (!category) return '';
  return TOUR_CATEGORY_LABELS[category] ?? category;
}
