import { cache } from 'react';

import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchActiveCatalogTourRows,
  pickHeroNearestTours,
  pickHomeFeaturedTours,
  type HeroPopularTour,
  type DisplayableCatalogTourRow,
} from '@/lib/tours/active-catalog-listing';

export type HomeCatalogData = {
  heroTours: HeroPopularTour[];
  featuredTours: DisplayableCatalogTourRow[];
  featuredTotal: number;
};

/** Один запрос каталога на главную (React cache + ISR на странице). */
export const getHomeCatalogData = cache(async (): Promise<HomeCatalogData> => {
  const supabase = createServiceClient();
  const catalogRows = await fetchActiveCatalogTourRows(supabase);
  const featured = pickHomeFeaturedTours(catalogRows);

  return {
    heroTours: pickHeroNearestTours(catalogRows, 5),
    featuredTours: featured.tours,
    featuredTotal: featured.total,
  };
});
