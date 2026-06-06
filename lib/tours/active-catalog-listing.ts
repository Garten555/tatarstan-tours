import type { SupabaseClient } from '@supabase/supabase-js';

import { sortCatalogTourRows } from '@/lib/tours/catalog-sort';
import {
  dedupeTourRowsForCatalog,
  type TourRowForDedupe,
} from '@/lib/tours/listing-dedupe';
import {
  computeNextCatalogVisibilityChangeAt,
  filterCatalogToursByUpcomingSessions,
  isTourVisibleInPublicCatalog,
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

export type ActiveCatalogSnapshot = {
  rows: ActiveCatalogTourRow[];
  nextVisibilityChangeAt: string | null;
};

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
    return { rows: [], nextVisibilityChangeAt: null };
  }

  const active = (data ?? []).filter((tour) => {
    if (!tour.end_date) return true;
    return new Date(tour.end_date) >= now;
  }) as ActiveCatalogTourRow[];

  if (active.length === 0) {
    return { rows: [], nextVisibilityChangeAt: null };
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
    return { rows: dedupeTourRowsForCatalog(bookable), nextVisibilityChangeAt: null };
  }

  const sessionsByTourId = new Map<string, { id: string; start_at: string }[]>();
  for (const row of sessionRows ?? []) {
    const list = sessionsByTourId.get(row.tour_id) ?? [];
    list.push({ id: row.id, start_at: row.start_at });
    sessionsByTourId.set(row.tour_id, list);
  }

  const bookable = active.filter((tour) =>
    isTourVisibleInPublicCatalog(tour, sessionsByTourId.get(tour.id) ?? [], now)
  );
  const rows = dedupeTourRowsForCatalog(bookable);
  const nextVisibilityChangeAt = computeNextCatalogVisibilityChangeAt(
    bookable,
    sessionsByTourId,
    now
  );

  return { rows, nextVisibilityChangeAt };
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
  tour: Pick<ActiveCatalogTourRow, 'title' | 'slug' | 'price_per_person' | 'start_date' | 'end_date'>
): HeroPopularTour {
  const start = tour.start_date ? String(tour.start_date) : '';
  const endRaw = tour.end_date != null ? String(tour.end_date) : start;
  let durationLabel: string | null = null;
  if (start) {
    const s = new Date(start);
    const e = new Date(endRaw);
    const diffMs = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const h = Math.ceil(diffMs / (1000 * 60 * 60));
      durationLabel = h > 0 ? `${h} ч` : '1 день';
    } else {
      durationLabel = `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
    }
  }
  return {
    title: String(tour.title ?? ''),
    slug: tour.slug ? String(tour.slug) : undefined,
    price: typeof tour.price_per_person === 'number' ? tour.price_per_person : null,
    durationLabel,
    startDateLabel: start
      ? new Date(start).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })
      : null,
    startDateIso: start || null,
  };
}

/** Hero «Ближайший выезд»: те же правила, что в каталоге; сортировка по start_date. */
export function pickHeroNearestTours(
  rows: ActiveCatalogTourRow[],
  limit = 5
): HeroPopularTour[] {
  const sorted = sortCatalogTourRows(rows, 'start_date', 'asc');
  const tours: HeroPopularTour[] = [];
  for (const tour of sorted) {
    if (!tour.title?.trim() || !tour.slug?.trim()) continue;
    tours.push(toHeroPopularTour(tour));
    if (tours.length >= limit) break;
  }
  return tours;
}
