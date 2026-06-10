// Отмена своего бронирования пользователем (PATCH)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { publishBookingsChanged } from '@/lib/pusher/data-sync';
import {
  bookingCancellationBlockedReason,
} from '@/lib/bookings/booking-cancellation';
import type { BookingForReview } from '@/lib/bookings/review-eligibility';

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action !== 'cancel') {
      return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
    }

    const { data: bookingRow, error: bookingErr } = await serviceClient
      .from('bookings')
      .select(`
        id,
        user_id,
        tour_id,
        session_id,
        num_people,
        status,
        payment_status,
        total_price,
        departure_start_at,
        departure_end_at,
        schedule_superseded_at,
        tour_session:tour_sessions!bookings_session_id_fkey(start_at, end_at),
        tour:tours(title, start_date, end_date, status)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (bookingErr || !bookingRow) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
    }

    const booking = bookingRow as unknown as {
      id: string;
      user_id: string;
      tour_id: string;
      session_id: string | null;
      num_people: number;
      status: string;
      payment_status: string | null;
      total_price: number;
      departure_start_at?: string | null;
      departure_end_at?: string | null;
      schedule_superseded_at?: string | null;
      tour_session?: { start_at?: string | null; end_at?: string | null } | null;
      tour?: {
        title: string;
        start_date: string;
        end_date?: string | null;
        status?: string | null;
      } | null;
    };

    const bookingForCancel: BookingForReview = {
      status: booking.status,
      departure_start_at: booking.departure_start_at,
      departure_end_at: booking.departure_end_at,
      schedule_superseded_at: booking.schedule_superseded_at,
      tour_session: unwrapRelation(booking.tour_session),
      tour: unwrapRelation(booking.tour),
    };

    const cancelBlockReason = bookingCancellationBlockedReason(bookingForCancel);
    if (cancelBlockReason) {
      if (booking.status === 'cancelled') {
        return NextResponse.json({
          success: true,
          message: 'Бронирование уже было отменено',
        });
      }
      return NextResponse.json({ error: cancelBlockReason }, { status: 400 });
    }

    const tour = unwrapRelation(booking.tour);

    const { error: updateErr } = await serviceClient
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
      })
      .eq('id', booking.id)
      .eq('user_id', user.id);

    if (updateErr) {
      console.error('Ошибка отмены бронирования:', updateErr);
      return NextResponse.json(
        { error: 'Не удалось отменить бронирование' },
        { status: 500 }
      );
    }

    const n = booking.num_people || 0;

    if (booking.session_id) {
      const { data: sess } = await serviceClient
        .from('tour_sessions')
        .select('current_participants')
        .eq('id', booking.session_id)
        .maybeSingle();
      const cur = (sess as { current_participants?: number } | null)?.current_participants ?? 0;
      await serviceClient
        .from('tour_sessions')
        .update({ current_participants: Math.max(0, cur - n) })
        .eq('id', booking.session_id);
    } else {
      const { data: tr } = await serviceClient
        .from('tours')
        .select('current_participants')
        .eq('id', booking.tour_id)
        .maybeSingle();
      const cur = (tr as { current_participants?: number } | null)?.current_participants ?? 0;
      await serviceClient
        .from('tours')
        .update({ current_participants: Math.max(0, cur - n) })
        .eq('id', booking.tour_id);
    }

    let roomQuery = serviceClient.from('tour_rooms').select('id');
    if (booking.session_id) {
      roomQuery = roomQuery.eq('tour_session_id', booking.session_id);
    } else {
      roomQuery = roomQuery.eq('tour_id', booking.tour_id).is('tour_session_id', null);
    }
    const { data: room } = await roomQuery.maybeSingle();
    const rid = (room as { id?: string } | null)?.id;
    if (rid) {
      await serviceClient
        .from('tour_room_participants')
        .delete()
        .eq('room_id', rid)
        .eq('user_id', user.id);
    }

    try {
      const { data: userProfileRaw } = await serviceClient
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();

      const userProfile = userProfileRaw as {
        email: string | null;
        first_name: string | null;
        last_name: string | null;
      } | null;

      if (userProfile?.email && tour?.title && tour.start_date) {
        const userName =
          userProfile.first_name && userProfile.last_name
            ? `${userProfile.first_name} ${userProfile.last_name}`
            : userProfile.email;

        const tourDate = new Date(tour.start_date).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const { sendEmail, getBookingCancellationEmail } = await import('@/lib/email/send-email');
        await sendEmail({
          to: userProfile.email,
          subject: `Бронирование отменено: ${tour.title}`,
          html: getBookingCancellationEmail(
            userName,
            tour.title,
            tourDate,
            booking.num_people,
            parseFloat(String(booking.total_price))
          ),
        });
      }
    } catch (emailError) {
      console.error('Ошибка отправки email при отмене:', emailError);
    }

    void publishBookingsChanged(user.id);
    return NextResponse.json({
      success: true,
      message: 'Бронирование отменено',
    });
  } catch (error) {
    console.error('Ошибка API отмены бронирования:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
