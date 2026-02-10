// API для получения посещенных локаций
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Получаем дневники с локациями
    const { data: diaries, error } = await serviceClient
      .from('travel_diaries')
      .select('location_data, tour_id')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .not('location_data', 'is', null);

    if (error) {
      console.error('[Passport Locations API] Error:', error);
      return NextResponse.json(
        { error: 'Не удалось получить локации' },
        { status: 500 }
      );
    }

    // Собираем уникальные локации
    const locationsMap = new Map<string, { name: string; visit_count: number }>();

    if (diaries) {
      diaries.forEach((diary: any) => {
        if (diary.location_data?.locations) {
          diary.location_data.locations.forEach((loc: any) => {
            if (loc.name) {
              const existing = locationsMap.get(loc.name);
              if (existing) {
                existing.visit_count += 1;
              } else {
                locationsMap.set(loc.name, {
                  name: loc.name,
                  visit_count: 1,
                });
              }
            }
          });
        }
      });
    }

    // Также получаем локации из туров
    const { data: bookings } = await serviceClient
      .from('bookings')
      .select(`
        tour:tours(
          city:cities(name)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (bookings) {
      bookings.forEach((booking: any) => {
        const cityName = booking.tour?.city?.name;
        if (cityName) {
          const existing = locationsMap.get(cityName);
          if (existing) {
            existing.visit_count += 1;
          } else {
            locationsMap.set(cityName, {
              name: cityName,
              visit_count: 1,
            });
          }
        }
      });
    }

    const locations = Array.from(locationsMap.values())
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 20); // Топ 20 локаций

    return NextResponse.json({
      success: true,
      locations: locations.map((loc, index) => ({
        id: `loc-${index}`,
        ...loc,
      })),
    });
  } catch (error: any) {
    console.error('[Passport Locations API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}





















