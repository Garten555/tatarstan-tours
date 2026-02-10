// API для получения достижений пользователя
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

    // Получаем достижения
    const { data: achievements, error } = await serviceClient
      .from('achievements')
      .select(`
        id,
        badge_type,
        badge_name,
        badge_description,
        badge_icon_url,
        unlock_date,
        tour_id,
        diary_id
      `)
      .eq('user_id', user.id)
      .order('unlock_date', { ascending: false });

    if (error) {
      console.error('[Passport Achievements API] Error:', error);
      return NextResponse.json(
        { error: 'Не удалось получить достижения' },
        { status: 500 }
      );
    }

    // Подсчитываем общее количество возможных достижений (можно расширить)
    const totalAchievements = 20; // Примерное количество

    return NextResponse.json({
      success: true,
      achievements: achievements || [],
      total_achievements: totalAchievements,
    });
  } catch (error: any) {
    console.error('[Passport Achievements API] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}





















