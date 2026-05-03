/**
 * Отсекает заведомо неверные сегменты пути /tours/[slug]:
 * абсолютные URL и артефакты парсеров (например «https:», «https:/host»).
 */
export function isInvalidTourSlug(slug: string): boolean {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return true;
  }
  const s = decoded.trim();
  if (!s) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^https?:$/i.test(s)) return true;
  // «https:/example.com» без второго слеша после схемы
  if (/^https:\/[^/]/i.test(s)) return true;
  return false;
}
