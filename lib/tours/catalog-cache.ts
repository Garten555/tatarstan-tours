import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchActiveCatalogSnapshot,
  type ActiveCatalogSnapshot,
  type CatalogSessionRow,
} from '@/lib/tours/active-catalog-listing';

type CachedCatalogPayload = {
  rows: ActiveCatalogSnapshot['rows'];
  nextVisibilityChangeAt: string | null;
  sessionsEntries: [string, CatalogSessionRow[]][];
};

const loadCatalogPayload = unstable_cache(
  async (): Promise<CachedCatalogPayload> => {
    const supabase = createServiceClient();
    const snap = await fetchActiveCatalogSnapshot(supabase);
    return {
      rows: snap.rows,
      nextVisibilityChangeAt: snap.nextVisibilityChangeAt,
      sessionsEntries: [...snap.sessionsByTourId.entries()],
    };
  },
  ['active-catalog-snapshot-v1'],
  { revalidate: 45 }
);

/** Кэшированный снимок каталога (45 с) — для /api/tours/filter и главной. */
export async function getCachedActiveCatalogSnapshot(): Promise<ActiveCatalogSnapshot> {
  const cached = await loadCatalogPayload();
  return {
    rows: cached.rows,
    nextVisibilityChangeAt: cached.nextVisibilityChangeAt,
    sessionsByTourId: new Map(cached.sessionsEntries),
  };
}
