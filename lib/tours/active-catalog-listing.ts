import type { SupabaseClient } from '@supabase/supabase-js';

import { sortCatalogTourRows } from '@/lib/tours/catalog-sort';
import {
  dedupeTourRowsForCatalog,
  type TourRowForDedupe,
} from '@/lib/tours/listing-dedupe';
import { filterCatalogToursByUpcomingSessions } from '@/lib/tours/tour-public-visibility';

export const FEATURED_HOME_TOUR_LIMIT = 3;

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

/** Активные туры каталога: как в /api/tours/filter до сортировки и пагинации. */
export async function fetchActiveCatalogTourRows(
  supabase: SupabaseClient
): Promise<ActiveCatalogTourRow[]> {
  const now = new Date().toISOString();
  const currentTime = new Date();

  const { data, error } = await supabase
    .from('tours')
    .select(CATALOG_TOUR_SELECT)
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${now}`)
    .limit(8000);

  if (error) {
    console.error('fetchActiveCatalogTourRows:', error);
    return [];
  }

  const active = (data ?? []).filter((tour) => {
    if (!tour.end_date) return true;
    return new Date(tour.end_date) >= currentTime;
  }) as ActiveCatalogTourRow[];

  const bookable = await filterCatalogToursByUpcomingSessions(supabase, active);
  return dedupeTourRowsForCatalog(bookable);
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
