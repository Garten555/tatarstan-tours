// API для получения бронирований пользователя
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

    // Загружаем бронирования пользователя
    // Оптимизировано: только нужные поля, без лишних данных
    const { data: bookings, error } = await serviceClient
      .from('bookings')
      .select(`
        id,
        tour_id,
        status,
        payment_status,
        total_price,
        num_people,
        payment_method,
        created_at,
        tour:tours!bookings_tour_id_fkey(
          id,
          title,
          slug,
          start_date,
          end_date,
          cover_image,
          status,
          city:cities(name)
        ),
        review:reviews!reviews_booking_id_fkey(
          id,
          rating
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100); // Ограничиваем количество для производительности

    if (error) {
      console.error('Ошибка загрузки бронирований:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить бронирования' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookings: bookings || [],
    });
  } catch (error) {
    console.error('Ошибка API бронирований:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

