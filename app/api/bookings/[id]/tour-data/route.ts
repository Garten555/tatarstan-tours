// API для получения данных тура из бронирования
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
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

    // Загружаем бронирование с данными тура
    const { data: booking, error: bookingError } = await serviceClient
      .from('bookings')
      .select(`
        id,
        tour_id,
        status,
        user_id,
        tour:tours(
          id,
          title,
          start_date,
          end_date,
          cover_image,
          city:cities(name),
          locations,
          description,
          short_desc,
          full_desc,
          yandex_map_data
        )
      `)
      .eq('id', bookingId)
      .eq('user_id', user.id) // Проверяем, что бронирование принадлежит пользователю
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Бронирование не найдено' },
        { status: 404 }
      );
    }

    const bookingData = booking as any;
    return NextResponse.json({
      booking: {
        id: bookingData.id,
        tour_id: bookingData.tour_id,
        status: bookingData.status,
      },
      tour: Array.isArray(bookingData.tour) ? bookingData.tour[0] : bookingData.tour,
    });
  } catch (error) {
    console.error('Ошибка API получения данных тура из бронирования:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}







