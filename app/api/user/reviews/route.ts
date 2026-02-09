// API для получения отзывов пользователя
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    // Проверяем авторизацию
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

    // Загружаем отзывы пользователя
    const { data: reviews, error } = await serviceClient
      .from('reviews')
      .select(`
        id,
        rating,
        text,
        created_at,
        tour:tours!reviews_tour_id_fkey(
          id,
          title,
          slug,
          cover_image
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Ошибка загрузки отзывов:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить отзывы' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reviews: reviews || [],
    });
  } catch (error) {
    console.error('Ошибка API отзывов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}












