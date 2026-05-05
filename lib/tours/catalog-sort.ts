/**
 * Разбор значения селекта вида `price_per_person-asc` (нельзя делить простым split('-')).
 */
export function parseClientSortParam(sortBy: string): {
  sortField: string;
  sortOrder: 'asc' | 'desc';
} {
  const s = sortBy.trim();
  const lastDash = s.lastIndexOf('-');
  if (lastDash <= 0) {
    return { sortField: 'created_at', sortOrder: 'desc' };
  }
  const sortField = s.slice(0, lastDash);
  const tail = s.slice(lastDash + 1);
  const sortOrder = tail === 'asc' ? 'asc' : 'desc';
  return { sortField, sortOrder };
}

/**
 * Сортировка карточек каталога после dedupe (Postgres order теряется при склейке дубликатов).
 */
const SORT_FIELDS = ['created_at', 'price_per_person', 'start_date', 'title'] as const;
export type CatalogSortField = (typeof SORT_FIELDS)[number];

export function normalizeCatalogSortField(sortBy: string): CatalogSortField {
  return SORT_FIELDS.includes(sortBy as CatalogSortField) ? (sortBy as CatalogSortField) : 'created_at';
}

export function sortCatalogTourRows<T extends Record<string, unknown>>(
  rows: T[],
  sortField: string,
  sortOrder: 'asc' | 'desc'
): T[] {
  const field = normalizeCatalogSortField(sortField);
  const ascending = sortOrder === 'asc';
  const dir = ascending ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (field === 'title') {
      const cmp = String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ru', { sensitivity: 'base' });
      return cmp * dir;
    }
    if (field === 'price_per_person') {
      const fromA = (a as { catalog_price_from?: unknown }).catalog_price_from;
      const fromB = (b as { catalog_price_from?: unknown }).catalog_price_from;
      const na = Number(fromA ?? a.price_per_person);
      const nb = Number(fromB ?? b.price_per_person);
      const safeA = Number.isFinite(na) ? na : 0;
      const safeB = Number.isFinite(nb) ? nb : 0;
      return (safeA - safeB) * dir;
    }
    const va = a[field];
    const vb = b[field];
    const ta = va ? new Date(va as string).getTime() : 0;
    const tb = vb ? new Date(vb as string).getTime() : 0;
    return (ta - tb) * dir;
  });
}
