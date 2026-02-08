// API для получения публичного профиля по username
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/users/[username] - Получить публичный профиль
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { username } = await params;

    // Убираем @ если есть
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

    // Получаем профиль по username
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select(`
        id,
        username,
        bio,
        avatar_url,
        public_profile_enabled,
        status_level,
        reputation_score,
        created_at
      `)
      .eq('username', cleanUsername)
      .eq('public_profile_enabled', true) // Только если публичный профиль включен
      .maybeSingle();

    if (profileError) {
      console.error('[User Profile API] Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Не удалось получить профиль' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Профиль не найден или не публичный' },
        { status: 404 }
      );
    }

    // Получаем статистику
    const [diariesResult, achievementsResult, reviewsResult, bookingsResult, followersResult, followingResult] = await Promise.all([
      // Опубликованные дневники
      serviceClient
        .from('travel_diaries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'published'),
      
      // Достижения
      serviceClient
        .from('achievements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id),
      
      // Отзывы
      serviceClient
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_published', true),
      
      // Завершенные туры
      serviceClient
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'completed'),
      
      // Подписчики
      serviceClient
        .from('user_follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('followed_id', profile.id),
      
      // Подписки
      serviceClient
        .from('user_follows')
        .select('followed_id', { count: 'exact', head: true })
        .eq('follower_id', profile.id),
    ]);

    // Получаем последние опубликованные дневники
    const { data: recentDiaries } = await serviceClient
      .from('travel_diaries')
      .select(`
        id,
        title,
        cover_image_url,
        travel_date,
        views_count,
        likes_count,
        created_at
      `)
      .eq('user_id', profile.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6);

    // Получаем последние достижения
    const { data: recentAchievements } = await serviceClient
      .from('achievements')
      .select(`
        id,
        badge_type,
        badge_name,
        badge_icon_url,
        unlock_date
      `)
      .eq('user_id', profile.id)
      .order('unlock_date', { ascending: false })
      .limit(10);

    // Проверяем, подписан ли текущий пользователь
    let isFollowing = false;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: follow } = await serviceClient
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', currentUser.id)
        .eq('followed_id', profile.id)
        .maybeSingle();
      
      isFollowing = !!follow;
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        stats: {
          diaries_count: diariesResult.count || 0,
          achievements_count: achievementsResult.count || 0,
          reviews_count: reviewsResult.count || 0,
          completed_tours_count: bookingsResult.count || 0,
          followers_count: followersResult.count || 0,
          following_count: followingResult.count || 0,
        },
        recent_diaries: recentDiaries || [],
        recent_achievements: recentAchievements || [],
        is_following: isFollowing,
      },
    });
  } catch (error: any) {
    console.error('[User Profile API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

