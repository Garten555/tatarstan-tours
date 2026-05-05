/**
 * Убирает дубликаты одного и того же продукта в списках каталога:
 * несколько строк tours с тем же названием и городом (старый способ «несколько дат»)
 * склеиваются в одну карточку.
 *
 * Победитель группы: ближайшая дата start_date; при равенстве — более новый created_at.
 */
export type TourRowForDedupe = {
  title: string;
  city_id?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  price_per_person?: number | string | null;
};

function groupKey(t: TourRowForDedupe): string {
  const title = (t.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${title}|${t.city_id ?? ''}`;
}

function pickCanonicalTour<T extends TourRowForDedupe>(a: T, b: T): T {
  const ta = a.start_date ? new Date(a.start_date).getTime() : Number.POSITIVE_INFINITY;
  const tb = b.start_date ? new Date(b.start_date).getTime() : Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta <= tb ? a : b;
  const pa = Number(a.price_per_person);
  const pb = Number(b.price_per_person);
  if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) {
    return pa <= pb ? a : b;
  }
  const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
  const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
  return cb >= ca ? b : a;
}

/** Оставляет по одному туру на ключ (название + город), порядок — как у первого вхождения группы в исходном массиве. */
export function dedupeTourRowsForCatalog<T extends TourRowForDedupe>(rows: T[]): T[] {
  const winners = new Map<string, T>();
  const firstIdx = new Map<string, number>();

  rows.forEach((row, index) => {
    const k = groupKey(row);
    if (!firstIdx.has(k)) firstIdx.set(k, index);
    const prev = winners.get(k);
    winners.set(k, prev ? pickCanonicalTour(prev, row) : row);
  });

  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const k = groupKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    const w = winners.get(k)!;
    out.push(w);
  }
  return out;
}
