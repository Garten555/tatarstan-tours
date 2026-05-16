import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchActiveCatalogTourRows } from '@/lib/tours/active-catalog-listing';

/** Число уникальных карточек каталога (как в /api/tours/filter без фильтров). */
export async function countActiveCatalogTours(
  supabase: SupabaseClient
): Promise<number> {
  const rows = await fetchActiveCatalogTourRows(supabase);
  return rows.length;
}
