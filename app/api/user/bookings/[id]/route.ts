// Отмена своего бронирования пользователем (PATCH)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

function tourEffectivelyEnded(params: {
  tourEnd?: string | null;
  tourStart?: string | null;
  sessionStart?: string | null;
  sessionEnd?: string | null;
}): boolean {
  const now = Date.now();
  if (params.sessionStart) {
    const start = new Date(params.sessionStart).getTime();
    if (!Number.isNaN(start) && start <= now) return true;
    return false;
  }
  const completionDate =
    params.sessionEnd ||
    params.tourEnd ||
    params.tourStart ||
    null;
  if (!completionDate) return false;
  const end = new Date(completionDate).getTime();
  return !Number.isNaN(end) && end <= now;
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
      .select(
        'id, user_id, tour_id, session_id, num_people, status, payment_status, total_price'
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (bookingErr || !bookingRow) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
    }

    const booking = bookingRow as {
      id: string;
      user_id: string;
      tour_id: string;
      session_id: string | null;
      num_people: number;
      status: string;
      payment_status: string | null;
      total_price: number;
    };

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Это бронирование нельзя отменить' },
        { status: 400 }
      );
    }

    const { data: tourRow } = await serviceClient
      .from('tours')
      .select('title, start_date, end_date, status')
      .eq('id', booking.tour_id)
      .maybeSingle();

    const tour = tourRow as {
      title: string;
      start_date: string;
      end_date?: string | null;
      status?: string | null;
    } | null;

    let sessionStart: string | null = null;
    let sessionEnd: string | null = null;
    if (booking.session_id) {
      const { data: srow } = await serviceClient
        .from('tour_sessions')
        .select('start_at, end_at')
        .eq('id', booking.session_id)
        .maybeSingle();
      const s = srow as { start_at?: string; end_at?: string | null } | null;
      sessionStart = s?.start_at ?? null;
      sessionEnd = (s?.end_at as string | undefined) ?? null;
    }

    if (
      tourEffectivelyEnded({
        tourEnd: tour?.end_date ?? null,
        tourStart: tour?.start_date ?? null,
        sessionStart,
        sessionEnd,
      }) ||
      tour?.status === 'completed'
    ) {
      return NextResponse.json(
        { error: 'Нельзя отменить бронирование: тур уже начался или завершён' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: 'Бронирование отменено',
    });
  } catch (error) {
    console.error('Ошибка API отмены бронирования:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
