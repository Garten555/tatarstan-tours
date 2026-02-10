// API для удаления всех бронирований пользователя (только для супер админа)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
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

    // Проверяем, что пользователь - супер админ
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен. Только для супер админа.' },
        { status: 403 }
      );
    }

    // Получаем все бронирования пользователя
    const { data: bookings, error: bookingsError } = await serviceClient
      .from('bookings')
      .select('id, tour_id')
      .eq('user_id', user.id);

    if (bookingsError) {
      console.error('Ошибка получения бронирований:', bookingsError);
      return NextResponse.json(
        { error: 'Не удалось получить бронирования' },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'Нет бронирований для удаления',
      });
    }

    const bookingIds = bookings.map(b => b.id);
    const tourIds = [...new Set(bookings.map(b => b.tour_id))];

    // Удаляем связанные данные
    // 1. Удаляем участников бронирований
    await serviceClient
      .from('booking_attendees')
      .delete()
      .in('booking_id', bookingIds);

    // 2. Удаляем участников из комнат туров
    for (const tourId of tourIds) {
      const { data: room } = await serviceClient
        .from('tour_rooms')
        .select('id')
        .eq('tour_id', tourId)
        .single();

      if (room) {
        await serviceClient
          .from('tour_room_participants')
          .delete()
          .eq('room_id', room.id)
          .eq('user_id', user.id);
      }
    }

    // 3. Удаляем отзывы
    await serviceClient
      .from('reviews')
      .delete()
      .in('booking_id', bookingIds);

    // 4. Удаляем бронирования
    const { error: deleteError } = await serviceClient
      .from('bookings')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Ошибка удаления бронирований:', deleteError);
      return NextResponse.json(
        { error: 'Не удалось удалить бронирования' },
        { status: 500 }
      );
    }

    // Обновляем количество участников в турах
    for (const tourId of tourIds) {
      const { data: tourBookings } = await serviceClient
        .from('bookings')
        .select('id, num_people')
        .eq('tour_id', tourId)
        .eq('status', 'confirmed');

      const totalParticipants = (tourBookings || []).reduce(
        (sum, b) => sum + (b.num_people || 0),
        0
      );

      await serviceClient
        .from('tours')
        .update({ current_participants: totalParticipants })
        .eq('id', tourId);
    }

    return NextResponse.json({
      success: true,
      deleted: bookings.length,
      message: `Удалено ${bookings.length} бронирований`,
    });
  } catch (error) {
    console.error('Ошибка API удаления бронирований:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}













