// API для рекомендаций пользователей на основе подписок
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const limit = parseInt(searchParams.get('limit') || '10');

    // Получаем список пользователей, на которых подписан текущий пользователь
    const { data: following } = await serviceClient
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', user.id);

    const followingIds = (following || []).map((f: any) => f.followed_id);
    followingIds.push(user.id); // Исключаем текущего пользователя

    // Получаем пользователей, на которых подписаны те, на кого подписан текущий пользователь
    // (друзья друзей)
    const { data: recommendations } = await serviceClient
      .from('user_follows')
      .select(`
        followed_id,
        followed:profiles!user_follows_followed_id_fkey(
          id,
          username,
          display_name,
          first_name,
          last_name,
          avatar_url,
          bio,
          status_level,
          reputation_score,
          public_profile_enabled
        )
      `)
      .in('follower_id', followingIds.length > 0 ? followingIds : [user.id])
      .not('followed_id', 'in', `(${followingIds.join(',')})`)
      .eq('public_profile_enabled', true)
      .limit(limit * 3); // Берем больше, чтобы потом отфильтровать

    if (!recommendations || recommendations.length === 0) {
      // Если нет рекомендаций на основе подписок, возвращаем популярных пользователей
      const { data: popularUsers } = await serviceClient
        .from('profiles')
        .select(`
          id,
          username,
          display_name,
          first_name,
          last_name,
          avatar_url,
          bio,
          status_level,
          reputation_score,
          public_profile_enabled
        `)
        .eq('public_profile_enabled', true)
        .neq('id', user.id)
        .not('id', 'in', `(${followingIds.join(',')})`)
        .order('reputation_score', { ascending: false })
        .limit(limit);

      return NextResponse.json({
        success: true,
        recommendations: popularUsers || [],
        source: 'popular',
      });
    }

    // Группируем по пользователям и считаем количество общих подписок
    const userCounts: Record<string, { user: any; count: number }> = {};

    recommendations.forEach((rec: any) => {
      const userId = rec.followed_id;
      if (!userCounts[userId]) {
        userCounts[userId] = {
          user: rec.followed,
          count: 0,
        };
      }
      userCounts[userId].count += 1;
    });

    // Сортируем по количеству общих подписок и берем топ
    const sortedRecommendations = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => item.user);

    return NextResponse.json({
      success: true,
      recommendations: sortedRecommendations,
      source: 'following',
    });
  } catch (error: any) {
    console.error('Ошибка загрузки рекомендаций:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}










