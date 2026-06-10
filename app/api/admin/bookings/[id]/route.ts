// API для управления конкретным бронированием
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  adminBookingPatchToRow,
  sanitizeAdminBookingPatch,
} from '@/lib/bookings/admin-booking-patch';
import { publishBookingsChanged } from '@/lib/pusher/data-sync';
import { syncTourParticipationAchievements } from '@/lib/achievements/auto-award';
import { bookingCancellationBlockedReason } from '@/lib/bookings/booking-cancellation';
import type { BookingForReview } from '@/lib/bookings/review-eligibility';

// PATCH - Обновление бронирования
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Проверяем права
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const typedProfile = (profile ?? null) as { role?: string | null } | null;

    if (typedProfile?.role !== 'tour_admin' && typedProfile?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const rawBody = await request.json();
    const updateData = sanitizeAdminBookingPatch(rawBody);
    if (updateData.status === 'cancelled' && !updateData.payment_status) {
      updateData.payment_status = 'refunded';
    }

    if (!updateData.status && !updateData.payment_status) {
      return NextResponse.json(
        { error: 'Нет полей для обновления (status или payment_status)' },
        { status: 400 }
      );
    }

    console.log('📝 Обновление бронирования:', { id, updateData });

    // Получаем старое бронирование для отправки email при отмене
    type OldBooking = {
      id: string;
      user_id: string;
      tour_id: string;
      num_people: number;
      total_price: number | string;
      status: string | null;
      payment_status: string | null;
      departure_start_at?: string | null;
      departure_end_at?: string | null;
      schedule_superseded_at?: string | null;
      tour_session?: { start_at?: string | null; end_at?: string | null } | null;
      tour: {
        title: string;
        start_date: string;
        end_date?: string | null;
        status?: string | null;
      } | null;
    };

    const unwrapRelation = <T,>(value: T | T[] | null | undefined): T | null => {
      if (value == null) return null;
      return Array.isArray(value) ? value[0] ?? null : value;
    };

    const { data: oldBookingRaw } = await serviceClient
      .from('bookings')
      .select(`
        id,
        user_id,
        tour_id,
        num_people,
        total_price,
        status,
        payment_status,
        departure_start_at,
        departure_end_at,
        schedule_superseded_at,
        tour_session:tour_sessions!bookings_session_id_fkey(start_at, end_at),
        tour:tours(title, start_date, end_date, status)
      `)
      .eq('id', id)
      .single();
    const oldBooking = (oldBookingRaw ?? null) as OldBooking | null;

    if (updateData.status === 'cancelled' && oldBooking) {
      const bookingForCancel: BookingForReview = {
        status: oldBooking.status ?? '',
        departure_start_at: oldBooking.departure_start_at,
        departure_end_at: oldBooking.departure_end_at,
        schedule_superseded_at: oldBooking.schedule_superseded_at,
        tour_session: unwrapRelation(oldBooking.tour_session),
        tour: unwrapRelation(oldBooking.tour),
      };
      const cancelBlockReason = bookingCancellationBlockedReason(bookingForCancel);
      if (cancelBlockReason && oldBooking.status !== 'cancelled') {
        return NextResponse.json({ error: cancelBlockReason }, { status: 400 });
      }
    }

    if (
      oldBooking?.status === 'completed' &&
      oldBooking?.payment_status === 'paid' &&
      (updateData.status || updateData.payment_status)
    ) {
      const statusChanging = updateData.status && updateData.status !== oldBooking.status;
      const paymentChanging =
        updateData.payment_status && updateData.payment_status !== oldBooking.payment_status;
      if (statusChanging || paymentChanging) {
        return NextResponse.json(
          { error: 'Нельзя менять статус завершенного и оплаченного бронирования' },
          { status: 400 }
        );
      }
    }

    const row = adminBookingPatchToRow(updateData);

    const { data: booking, error } = await serviceClient
      .from('bookings')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ Ошибка обновления бронирования:', error);
      return NextResponse.json(
        {
          error: 'Не удалось обновить бронирование',
          details: error.message || error.code || JSON.stringify(error),
        },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'Бронирование не найдено после обновления' },
        { status: 404 }
      );
    }

    console.log('✅ Бронирование обновлено:', booking);

    // Отправляем email уведомление при отмене бронирования
    if (updateData.status === 'cancelled' && oldBooking && oldBooking.status !== 'cancelled') {
      try {
        type ProfileContact = {
          email: string | null;
          first_name: string | null;
          last_name: string | null;
        };

        const { data: userProfileRaw } = await serviceClient
          .from('profiles')
          .select('email, first_name, last_name')
          .eq('id', oldBooking.user_id)
          .single();

        const userProfile = (userProfileRaw ?? null) as ProfileContact | null;

        const tourData = oldBooking.tour;

        if (userProfile?.email && tourData) {
          const userName = userProfile.first_name && userProfile.last_name
            ? `${userProfile.first_name} ${userProfile.last_name}`
            : userProfile.email;
          
          const tourDate = new Date(tourData.start_date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          const { sendEmail, getBookingCancellationEmail } = await import('@/lib/email/send-email');
          await sendEmail({
            to: userProfile.email,
            subject: `Бронирование отменено: ${tourData.title}`,
            html: getBookingCancellationEmail(
              userName,
              tourData.title,
              tourDate,
              oldBooking.num_people,
              parseFloat(oldBooking.total_price.toString())
            ),
          });
        }
      } catch (emailError) {
        // Не прерываем выполнение если email не отправился
        console.error('Ошибка отправки email уведомления об отмене:', emailError);
      }
    }

    const bookingUserId =
      (booking as { user_id?: string } | null)?.user_id ?? oldBooking?.user_id;
    if (bookingUserId) {
      void publishBookingsChanged(bookingUserId);
      if (updateData.status === 'completed' && oldBooking?.status !== 'completed') {
        void syncTourParticipationAchievements(
          serviceClient,
          bookingUserId,
          oldBooking?.tour_id ?? (booking as { tour_id?: string }).tour_id
        ).catch((err) => {
          console.error('[admin booking] syncTourParticipationAchievements:', err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Ошибка API обновления бронирования:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

