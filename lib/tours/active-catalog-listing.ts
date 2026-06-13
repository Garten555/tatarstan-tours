import type { SupabaseClient } from '@supabase/supabase-js';

import { formatDayMonthLongRu } from '@/lib/date/format-ru';
import { parseTourTimestampMs } from '@/lib/date/tour-timestamp';
import { sortCatalogTourRows } from '@/lib/tours/catalog-sort';
import {
  dedupeTourRowsForCatalog,
  groupKey,
  type TourRowForDedupe,
} from '@/lib/tours/listing-dedupe';
import {
  computeNextCatalogVisibilityChangeAt,
  filterCatalogToursByUpcomingSessions,
  isTourVisibleInPublicCatalog,
  nearestUpcomingDepartureAt,
} from '@/lib/tours/tour-public-visibility';

export const FEATURED_HOME_TOUR_LIMIT = 3;

/** Верхняя граница выборки active-туров (на практике каталог небольшой). */
const ACTIVE_CATALOG_QUERY_LIMIT = 300;

const CATALOG_TOUR_SELECT = `
  id,
  title,
  slug,
  short_desc,
  cover_image,
  price_per_person,
  start_date,
  end_date,
  max_participants,
  current_participants,
  tour_type,
  category,
  city_id,
  created_at
`;

export type ActiveCatalogTourRow = TourRowForDedupe & {
  slug: string;
  short_desc: string | null;
  cover_image: string | null;
  price_per_person: number;
  max_participants: number;
  current_participants: number | null;
  tour_type: string;
  category: string;
};

export type DisplayableCatalogTourRow = ActiveCatalogTourRow & {
  slug: string;
  cover_image: string;
  title: string;
};

function isDisplayableCatalogTour(
  tour: ActiveCatalogTourRow
): tour is DisplayableCatalogTourRow {
  return Boolean(
    tour.title?.trim() &&
      tour.slug?.trim() &&
      tour.cover_image?.trim() &&
      Number.isFinite(Number(tour.price_per_person))
  );
}

export type CatalogSessionRow = { id: string; start_at: string };

export type ActiveCatalogSnapshot = {
  rows: ActiveCatalogTourRow[];
  nextVisibilityChangeAt: string | null;
  sessionsByTourId: Map<string, CatalogSessionRow[]>;
};

/** После dedupe слоты всех дубликатов (название+город) привязываем к канонической карточке. */
function mergeSessionsForDedupedCatalog<T extends TourRowForDedupe>(
  bookable: T[],
  deduped: T[],
  sessionsByTourId: Map<string, CatalogSessionRow[]>
): Map<string, CatalogSessionRow[]> {
  const siblingsByKey = new Map<string, T[]>();
  for (const tour of bookable) {
    const key = groupKey(tour);
    const list = siblingsByKey.get(key) ?? [];
    list.push(tour);
    siblingsByKey.set(key, list);
  }

  const merged = new Map<string, CatalogSessionRow[]>();
  for (const tour of deduped) {
    const siblings = siblingsByKey.get(groupKey(tour)) ?? [tour];
    const sessions: CatalogSessionRow[] = [];
    const seen = new Set<string>();
    for (const sibling of siblings) {
      for (const row of sessionsByTourId.get(sibling.id) ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        sessions.push(row);
      }
    }
    merged.set(tour.id, sessions);
  }
  return merged;
}

/** Активные туры каталога: как в /api/tours/filter до сортировки и пагинации. */
export async function fetchActiveCatalogTourRows(
  supabase: SupabaseClient
): Promise<ActiveCatalogTourRow[]> {
  const snapshot = await fetchActiveCatalogSnapshot(supabase);
  return snapshot.rows;
}

export async function fetchActiveCatalogSnapshot(
  supabase: SupabaseClient
): Promise<ActiveCatalogSnapshot> {
  const now = new Date();
  const nowIso = now.toISOString();

  const { data, error } = await supabase
    .from('tours')
    .select(CATALOG_TOUR_SELECT)
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${nowIso}`)
    .limit(ACTIVE_CATALOG_QUERY_LIMIT);

  if (error) {
    console.error('fetchActiveCatalogSnapshot:', error);
    return { rows: [], nextVisibilityChangeAt: null, sessionsByTourId: new Map() };
  }

  const active = (data ?? []).filter((tour) => {
    if (!tour.end_date) return true;
    const endMs = parseTourTimestampMs(tour.end_date);
    return endMs === null || endMs >= now.getTime();
  }) as ActiveCatalogTourRow[];

  if (active.length === 0) {
    return { rows: [], nextVisibilityChangeAt: null, sessionsByTourId: new Map() };
  }

  const tourIds = active.map((t) => t.id);
  const { data: sessionRows, error: sessionError } = await supabase
    .from('tour_sessions')
    .select('id, tour_id, start_at')
    .eq('status', 'active')
    .in('tour_id', tourIds);

  if (sessionError) {
    console.error('fetchActiveCatalogSnapshot sessions:', sessionError);
    const bookable = await filterCatalogToursByUpcomingSessions(supabase, active);
    return {
      rows: dedupeTourRowsForCatalog(bookable),
      nextVisibilityChangeAt: null,
      sessionsByTourId: new Map(),
    };
  }

  const sessionsByTourId = new Map<string, CatalogSessionRow[]>();
  for (const row of sessionRows ?? []) {
    const list = sessionsByTourId.get(row.tour_id) ?? [];
    list.push({ id: row.id, start_at: row.start_at });
    sessionsByTourId.set(row.tour_id, list);
  }

  const bookable = active.filter((tour) =>
    isTourVisibleInPublicCatalog(tour, sessionsByTourId.get(tour.id) ?? [], now)
  );
  const rows = dedupeTourRowsForCatalog(bookable);
  const mergedSessionsByTourId = mergeSessionsForDedupedCatalog(
    bookable,
    rows,
    sessionsByTourId
  );
  const nextVisibilityChangeAt = computeNextCatalogVisibilityChangeAt(
    bookable,
    sessionsByTourId,
    now
  );

  return { rows, nextVisibilityChangeAt, sessionsByTourId: mergedSessionsByTourId };
}

export function pickHomeFeaturedTours(
  rows: ActiveCatalogTourRow[],
  limit = FEATURED_HOME_TOUR_LIMIT
): { tours: DisplayableCatalogTourRow[]; total: number } {
  const sorted = sortCatalogTourRows(rows, 'created_at', 'desc');
  const tours: DisplayableCatalogTourRow[] = [];

  for (const tour of sorted) {
    if (!isDisplayableCatalogTour(tour)) continue;
    tours.push(tour);
    if (tours.length >= limit) break;
  }

  return { tours, total: sorted.length };
}

export type HeroPopularTour = {
  title: string;
  slug?: string;
  price?: number | null;
  durationLabel?: string | null;
  startDateLabel?: string | null;
  /** ISO для клиентского таймера скрытия после старта выезда. */
  startDateIso?: string | null;
};

export function toHeroPopularTour(
  tour: Pick<ActiveCatalogTourRow, 'title' | 'slug' | 'price_per_person' | 'start_date' | 'end_date'>,
  nearestDepartureIso?: string | null
): HeroPopularTour {
  const departureIso =
    nearestDepartureIso || (tour.start_date ? String(tour.start_date) : '');
  const tourStart = tour.start_date ? String(tour.start_date) : '';
  const tourEnd = tour.end_date != null ? String(tour.end_date) : tourStart;
  let durationLabel: string | null = null;
  if (tourStart) {
    const startMs = parseTourTimestampMs(tourStart);
    const endMs = parseTourTimestampMs(tourEnd);
    if (startMs !== null && endMs !== null) {
      const diffMs = Math.abs(endMs - startMs);
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        const h = Math.ceil(diffMs / (1000 * 60 * 60));
        durationLabel = h > 0 ? `${h} ч` : '1 день';
      } else {
        durationLabel = `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
      }
    }
  }
  return {
    title: String(tour.title ?? ''),
    slug: tour.slug ? String(tour.slug) : undefined,
    price: typeof tour.price_per_person === 'number' ? tour.price_per_person : null,
    durationLabel,
    startDateLabel: departureIso ? formatDayMonthLongRu(departureIso) : null,
    startDateIso: departureIso || null,
  };
}

export type PickHeroNearestOptions = {
  sessionsByTourId?: Map<string, CatalogSessionRow[]>;
  now?: Date;
};

/** Hero «Ближайший выезд»: сортировка по ближайшему будущему слоту, не по start_date тура. */
export function pickHeroNearestTours(
  rows: ActiveCatalogTourRow[],
  limit = 5,
  options?: PickHeroNearestOptions
): HeroPopularTour[] {
  const now = options?.now ?? new Date();
  const sessionsByTourId = options?.sessionsByTourId;

  const ranked = rows
    .map((tour) => {
      const sessions = sessionsByTourId?.get(tour.id) ?? [];
      const departureAt = nearestUpcomingDepartureAt(tour, sessions, now);
      return { tour, departureAt };
    })
    .filter(
      (entry): entry is { tour: ActiveCatalogTourRow; departureAt: string } =>
        Boolean(entry.departureAt && entry.tour.title?.trim() && entry.tour.slug?.trim())
    )
    .sort(
      (a, b) =>
        (parseTourTimestampMs(a.departureAt) ?? 0) - (parseTourTimestampMs(b.departureAt) ?? 0)
    );

  const tours: HeroPopularTour[] = [];
  for (const { tour, departureAt } of ranked) {
    tours.push(toHeroPopularTour(tour, departureAt));
    if (tours.length >= limit) break;
  }
  return tours;
}
