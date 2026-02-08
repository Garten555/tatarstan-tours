import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Динамический роут (использует searchParams)
export const dynamic = 'force-dynamic';

type CityCount = {
  id: string;
  name: string;
  count: number;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = Number(searchParams.get('limit') || '6');
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 12) : 6;

    const supabase = await createServiceClient();
    const now = new Date().toISOString();

    const { data: tours, error: toursError } = await supabase
      .from('tours')
      .select('city_id')
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gte.${now}`);

    if (toursError) {
      console.error('Ошибка загрузки туров для футера:', toursError);
      return NextResponse.json({ cities: [] });
    }

    const counts = new Map<string, number>();
    (tours || []).forEach((tour) => {
      if (!tour.city_id) return;
      counts.set(tour.city_id, (counts.get(tour.city_id) || 0) + 1);
    });

    const cityIds = Array.from(counts.keys());
    if (cityIds.length === 0) {
      return NextResponse.json({ cities: [] });
    }

    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, name')
      .in('id', cityIds);

    if (citiesError) {
      console.error('Ошибка загрузки городов для футера:', citiesError);
      return NextResponse.json({ cities: [] });
    }

    const ranked = (cities || [])
      .map((city) => ({
        ...city,
        count: counts.get(city.id) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit) as CityCount[];

    return NextResponse.json({ cities: ranked.map(({ id, name }) => ({ id, name })) });
  } catch (error) {
    console.error('Ошибка API городов футера:', error);
    return NextResponse.json({ cities: [] });
  }
}



