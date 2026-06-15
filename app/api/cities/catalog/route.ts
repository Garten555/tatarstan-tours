import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { getCachedActiveCatalogSnapshot } from '@/lib/tours/catalog-cache';

const getCatalogCityIds = unstable_cache(
  async () => {
    const snapshot = await getCachedActiveCatalogSnapshot();
    return [...new Set(snapshot.rows.map((t) => t.city_id).filter(Boolean))] as string[];
  },
  ['catalog-city-ids-v1'],
  { revalidate: 45 }
);

/** Города, в которых есть хотя бы один активный тур в каталоге. */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
    const supabase = await createServiceClient();

    const cityIds = await getCatalogCityIds();
    if (cityIds.length === 0) {
      return NextResponse.json(
        { cities: [] },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
      );
    }

    let query = supabase.from('cities').select('id, name').in('id', cityIds).order('name', { ascending: true });

    if (q.length >= 1) {
      query = query.ilike('name_lower', `%${q}%`);
    }

    const { data: cities, error: citiesError } = await query;

    if (citiesError) {
      console.error('[cities/catalog]', citiesError);
      return NextResponse.json({ error: 'Не удалось загрузить города' }, { status: 500 });
    }

    return NextResponse.json(
      { cities: cities || [] },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (e) {
    console.error('[cities/catalog]', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
