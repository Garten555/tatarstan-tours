import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Города, в которых есть хотя бы один активный тур в каталоге. */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
    const supabase = await createServiceClient();
    const now = new Date().toISOString();

    const { data: tours, error: toursError } = await supabase
      .from('tours')
      .select('city_id')
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gte.${now}`);

    if (toursError) {
      console.error('[cities/catalog]', toursError);
      return NextResponse.json({ error: 'Не удалось загрузить города' }, { status: 500 });
    }

    const cityIds = [...new Set((tours || []).map((t) => t.city_id).filter(Boolean))] as string[];
    if (cityIds.length === 0) {
      return NextResponse.json({ cities: [] });
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

    return NextResponse.json({ cities: cities || [] });
  } catch (e) {
    console.error('[cities/catalog]', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
