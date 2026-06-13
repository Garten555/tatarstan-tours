import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/utils/sanitize';
import { CATALOG_TOURS_PER_PAGE } from '@/lib/tours/catalog-sort';
import { fetchActiveCatalogSnapshot } from '@/lib/tours/active-catalog-listing';
import { filterCatalogSnapshotRows } from '@/lib/tours/filter-catalog-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const search = sanitizeText(searchParams.get('search') || '').trim();
    const tourType = sanitizeText(searchParams.get('tour_type') || '').trim();
    const category = sanitizeText(searchParams.get('category') || '').trim();
    const cityId = sanitizeText(searchParams.get('city_id') || '').trim();
    const rawMin = searchParams.get('min_price')?.trim();
    const rawMax = searchParams.get('max_price')?.trim();
    const minParsed = rawMin ? parseFloat(rawMin.replace(',', '.')) : NaN;
    const maxParsed = rawMax ? parseFloat(rawMax.replace(',', '.')) : NaN;
    const minPrice = Number.isFinite(minParsed) ? minParsed : null;
    const maxPrice = Number.isFinite(maxParsed) ? maxParsed : null;
    const startDate = sanitizeText(searchParams.get('start_date') || '').trim();
    const endDate = sanitizeText(searchParams.get('end_date') || '').trim();
    let sortBy = sanitizeText(searchParams.get('sort_by') || 'created_at').trim();
    if (sortBy === 'price') sortBy = 'price_per_person';
    const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || String(CATALOG_TOURS_PER_PAGE), 10)),
      50
    );
    const offset = (page - 1) * limit;

    let cityIdsMatchingSearch: string[] = [];
    if (search) {
      const escapedSearch = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const { data: cities } = await supabase
        .from('cities')
        .select('id')
        .ilike('name', `%${escapedSearch}%`)
        .limit(50);
      cityIdsMatchingSearch = (cities ?? []).map((c) => (c as { id: string }).id);
    }

    const snapshot = await fetchActiveCatalogSnapshot(supabase);
    const catalogTours = filterCatalogSnapshotRows(snapshot.rows, {
      search,
      tourType,
      category,
      cityId,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      sortField: sortBy,
      sortOrder,
      cityIdsMatchingSearch,
    });

    const total = catalogTours.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const pageSlice = catalogTours.slice(offset, offset + limit);

    const cityIds = [...new Set(pageSlice.map((t) => t.city_id).filter(Boolean))] as string[];
    const cityById = new Map<string, { id: string; name: string }>();
    if (cityIds.length > 0) {
      const { data: cityRows } = await supabase
        .from('cities')
        .select('id, name')
        .in('id', cityIds);
      for (const c of cityRows ?? []) {
        cityById.set((c as { id: string }).id, c as { id: string; name: string });
      }
    }

    const toursWithAvailability = pageSlice.map((tour) => ({
      ...tour,
      city: tour.city_id ? cityById.get(tour.city_id) ?? null : null,
      available_spots: Math.max(0, tour.max_participants - (tour.current_participants || 0)),
      is_available: (tour.current_participants || 0) < tour.max_participants,
    }));

    return NextResponse.json(
      {
        tours: toursWithAvailability,
        /** Всего по текущим фильтрам (все страницы). */
        total,
        /** Все активные туры каталога без фильтров — для блока «N туров доступно». */
        catalogTotal: snapshot.rows.length,
        page,
        limit,
        totalPages,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Ошибка API фильтрации туров:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
