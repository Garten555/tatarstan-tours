import { cache } from 'react';

import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchActiveCatalogSnapshot,
  pickHeroNearestTours,
  pickHomeFeaturedTours,
  type HeroPopularTour,
  type DisplayableCatalogTourRow,
} from '@/lib/tours/active-catalog-listing';

export type HomeCatalogData = {
  heroTours: HeroPopularTour[];
  featuredTours: DisplayableCatalogTourRow[];
  featuredTotal: number;
  nextVisibilityChangeAt: string | null;
};

/** Один запрос каталога на главную (React cache + ISR на странице). */
export const getHomeCatalogData = cache(async (): Promise<HomeCatalogData> => {
  const supabase = createServiceClient();
  const snapshot = await fetchActiveCatalogSnapshot(supabase);
  const featured = pickHomeFeaturedTours(snapshot.rows);

  return {
    heroTours: pickHeroNearestTours(snapshot.rows, 5, {
      sessionsByTourId: snapshot.sessionsByTourId,
    }),
    featuredTours: featured.tours,
    featuredTotal: featured.total,
    nextVisibilityChangeAt: snapshot.nextVisibilityChangeAt,
  };
});
