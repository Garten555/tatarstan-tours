import type { ActiveCatalogTourRow } from '@/lib/tours/active-catalog-listing';
import { dedupeTourRowsForCatalog } from '@/lib/tours/listing-dedupe';
import { sortCatalogTourRows } from '@/lib/tours/catalog-sort';
import { parseTourTimestampMs } from '@/lib/date/tour-timestamp';

export type CatalogFilterParams = {
  search?: string;
  tourType?: string;
  category?: string;
  cityId?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  cityIdsMatchingSearch?: string[];
};

/** Фильтрация и сортировка строк каталога (после fetchActiveCatalogSnapshot). */
export function filterCatalogSnapshotRows(
  rows: ActiveCatalogTourRow[],
  params: CatalogFilterParams
): ActiveCatalogTourRow[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const cityMatch = new Set(params.cityIdsMatchingSearch ?? []);

  let filtered = rows;

  if (search) {
    filtered = filtered.filter((tour) => {
      const title = String(tour.title ?? '').toLowerCase();
      const desc = String(tour.short_desc ?? '').toLowerCase();
      const cityHit = tour.city_id && cityMatch.has(tour.city_id);
      return title.includes(search) || desc.includes(search) || cityHit;
    });
  }

  if (params.tourType) {
    filtered = filtered.filter((t) => t.tour_type === params.tourType);
  }
  if (params.category) {
    filtered = filtered.filter((t) => t.category === params.category);
  }
  if (params.cityId) {
    filtered = filtered.filter((t) => t.city_id === params.cityId);
  }

  if (params.minPrice != null && params.minPrice >= 0) {
    filtered = filtered.filter((t) => Number(t.price_per_person) >= params.minPrice!);
  }
  if (params.maxPrice != null && params.maxPrice >= 0) {
    filtered = filtered.filter((t) => Number(t.price_per_person) <= params.maxPrice!);
  }

  if (params.startDate) {
    const startMs = parseTourTimestampMs(params.startDate);
    if (startMs !== null) {
      filtered = filtered.filter((t) => {
        const ms = t.start_date ? parseTourTimestampMs(String(t.start_date)) : null;
        return ms !== null && ms >= startMs;
      });
    }
  }
  if (params.endDate) {
    const endMs = parseTourTimestampMs(params.endDate);
    if (endMs !== null) {
      filtered = filtered.filter((t) => {
        const ms = t.end_date ? parseTourTimestampMs(String(t.end_date)) : null;
        return ms === null || ms <= endMs;
      });
    }
  }

  const deduped = dedupeTourRowsForCatalog(filtered);
  const sortField = params.sortField ?? 'created_at';
  const sortOrder = params.sortOrder ?? 'desc';
  return sortCatalogTourRows(deduped, sortField, sortOrder);
}
