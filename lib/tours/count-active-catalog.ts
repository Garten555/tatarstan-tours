import type { SupabaseClient } from '@supabase/supabase-js';

import {
  dedupeTourRowsForCatalog,
  type TourRowForDedupe,
} from '@/lib/tours/listing-dedupe';
import { filterCatalogToursByUpcomingSessions } from '@/lib/tours/tour-public-visibility';

/** Число уникальных карточек каталога (как в /api/tours/filter без фильтров). */
export async function countActiveCatalogTours(
  supabase: SupabaseClient
): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('tours')
    .select('id, title, city_id, start_date, created_at, price_per_person, end_date')
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gte.${now}`)
    .limit(8000);

  if (error) {
    console.error('countActiveCatalogTours:', error);
    return 0;
  }

  const currentTime = new Date();
  const active = (data ?? []).filter((tour) => {
    if (!tour.end_date) return true;
    const endDate = new Date(tour.end_date);
    return endDate >= currentTime;
  });

  const bookable = await filterCatalogToursByUpcomingSessions(
    supabase,
    active as TourRowForDedupe[]
  );

  return dedupeTourRowsForCatalog(bookable).length;
}
