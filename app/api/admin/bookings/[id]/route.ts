// API для управления конкретным бронированием
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { publishBookingsChanged } from '@/lib/pusher/data-sync';

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

    const updateData = await request.json();
    if (updateData?.status === 'cancelled' && !updateData.payment_status) {
      updateData.payment_status = 'refunded';
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
      tour: { title: string; start_date: string } | null;
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
        tour:tours(title, start_date)
      `)
      .eq('id', id)
      .single();
    const oldBooking = (oldBookingRaw ?? null) as OldBooking | null;

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

    // Валидация значений статусов
    if (updateData.status) {
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
      if (!validStatuses.includes(updateData.status)) {
        return NextResponse.json(
          { error: `Недопустимый статус: ${updateData.status}` },
          { status: 400 }
        );
      }
    }

    if (updateData.payment_status) {
      const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
      if (!validPaymentStatuses.includes(updateData.payment_status)) {
        return NextResponse.json(
          { error: `Недопустимый статус оплаты: ${updateData.payment_status}` },
          { status: 400 }
        );
      }
    }

    // Обновляем бронирование
    const { data: booking, error } = await serviceClient
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка обновления бронирования:', error);
      console.error('❌ Детали ошибки:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Не удалось обновить бронирование',
          details: error.message || JSON.stringify(error)
        },
        { status: 500 }
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

