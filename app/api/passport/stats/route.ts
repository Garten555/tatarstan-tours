// API для получения статистики туристического паспорта
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

    // Получаем статистику параллельно
    const [
      diariesCount,
      achievementsCount,
      reviewsCount,
      bookingsCount,
      followersCount,
      followingCount,
      locationsCount,
      profileResult
    ] = await Promise.all([
      // Опубликованные дневники
      serviceClient
        .from('travel_diaries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'published'),
      
      // Достижения
      serviceClient
        .from('achievements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      // Отзывы
      serviceClient
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_published', true),
      
      // Завершенные туры
      serviceClient
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed'),
      
      // Подписчики
      serviceClient
        .from('user_follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('followed_id', user.id),
      
      // Подписки
      serviceClient
        .from('user_follows')
        .select('followed_id', { count: 'exact', head: true })
        .eq('follower_id', user.id),
      
      // Уникальные локации из дневников
      serviceClient
        .from('travel_diaries')
        .select('location_data')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .not('location_data', 'is', null),
      
      // Профиль для reputation_score
      serviceClient
        .from('profiles')
        .select('reputation_score, status_level')
        .eq('id', user.id)
        .single(),
    ]);

    // Подсчитываем уникальные локации
    const locationsSet = new Set<string>();
    if (locationsCount.data) {
      locationsCount.data.forEach((diary: any) => {
        if (diary.location_data?.locations) {
          diary.location_data.locations.forEach((loc: any) => {
            if (loc.name) locationsSet.add(loc.name);
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        diaries_count: diariesCount.count || 0,
        achievements_count: achievementsCount.count || 0,
        reviews_count: reviewsCount.count || 0,
        completed_tours_count: bookingsCount.count || 0,
        followers_count: followersCount.count || 0,
        following_count: followingCount.count || 0,
        locations_visited: locationsSet.size,
        reputation_score: profileResult.data?.reputation_score || 0,
        status_level: profileResult.data?.status_level || 1,
      },
    });
  } catch (error: any) {
    console.error('[Passport Stats API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}




















