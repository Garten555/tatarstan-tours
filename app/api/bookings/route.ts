// API для создания бронирования
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { TourSessionRow } from '@/lib/types/tour-session';
import { ensureTourRoomForSession } from '@/lib/tour/ensure-session-room';

export async function POST(request: NextRequest) {
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

    // Получаем данные бронирования
    const bookingData = await request.json();
    const {
      tour_id,
      session_id: sessionIdRaw,
      num_people,
      total_price,
      payment_method,
      payment_data,
      save_card,
      attendees,
    } = bookingData;
    const session_id =
      typeof sessionIdRaw === 'string' && sessionIdRaw.length > 0 ? sessionIdRaw : null;

    // Валидация
    if (!tour_id || !num_people || !total_price || !payment_method) {
      return NextResponse.json(
        { error: 'Не все обязательные поля заполнены' },
        { status: 400 }
      );
    }

    // Проверяем доступность тура
    const { data: tour, error: tourError } = await serviceClient
      .from('tours')
      .select('max_participants, current_participants, price_per_person, status, start_date, end_date')
      .eq('id', tour_id)
      .single();

    if (tourError || !tour) {
      return NextResponse.json(
        { error: 'Тур не найден' },
        { status: 404 }
      );
    }

    if ((tour as any).status !== 'active') {
      return NextResponse.json(
        { error: 'Тур недоступен для бронирования' },
        { status: 400 }
      );
    }

    const now = new Date();

    const sessionProbeRes = await serviceClient
      .from('tour_sessions')
      .select('id')
      .eq('tour_id', tour_id)
      .limit(1);

    const tourHasSessions =
      !sessionProbeRes.error &&
      Array.isArray(sessionProbeRes.data) &&
      sessionProbeRes.data.length > 0;

    let sessionRow: TourSessionRow | null = null;

    if (tourHasSessions) {
      if (!session_id) {
        return NextResponse.json(
          { error: 'Выберите дату выезда (слот тура)' },
          { status: 400 }
        );
      }
      const { data: srow, error: sErr } = await serviceClient
        .from('tour_sessions')
        .select('id, start_at, end_at, max_participants, current_participants, status, guide_id')
        .eq('id', session_id)
        .eq('tour_id', tour_id)
        .single();

      if (sErr || !srow || (srow as any).status !== 'active') {
        return NextResponse.json({ error: 'Слот тура не найден или недоступен' }, { status: 400 });
      }
      sessionRow = srow as TourSessionRow;
      const endS = sessionRow.end_at ? new Date(sessionRow.end_at) : null;
      const startS = new Date(sessionRow.start_at);
      if (endS && endS <= now) {
        return NextResponse.json(
          { error: 'Бронирование недоступно: выбранная дата уже прошла' },
          { status: 400 }
        );
      }
      if (!endS && startS <= now) {
        return NextResponse.json(
          { error: 'Бронирование недоступно: выбранная дата уже прошла' },
          { status: 400 }
        );
      }

      const availableSpots =
        sessionRow.max_participants - (sessionRow.current_participants ?? 0);
      if (num_people > availableSpots) {
        return NextResponse.json(
          { error: `Доступно только ${availableSpots} мест` },
          { status: 400 }
        );
      }

      const { data: existingBookings, error: existingBookingsError } = await serviceClient
        .from('bookings')
        .select('id')
        .eq('tour_id', tour_id)
        .eq('user_id', user.id)
        .eq('session_id', session_id)
        .in('status', ['pending', 'confirmed'])
        .limit(1);

      if (existingBookingsError) {
        console.error('Ошибка проверки бронирований:', existingBookingsError);
        return NextResponse.json(
          { error: 'Не удалось проверить бронирование' },
          { status: 500 }
        );
      }

      if ((existingBookings || []).length > 0) {
        return NextResponse.json(
          { error: 'У вас уже есть бронирование на этот выезд' },
          { status: 400 }
        );
      }
    } else {
      const endDate = (tour as any).end_date ? new Date((tour as any).end_date) : null;
      if (endDate && endDate <= now) {
        return NextResponse.json(
          { error: 'Бронирование недоступно: тур уже закончился' },
          { status: 400 }
        );
      }

      const availableSpots =
        (tour as any).max_participants - ((tour as any).current_participants || 0);
      if (num_people > availableSpots) {
        return NextResponse.json(
          { error: `Доступно только ${availableSpots} мест` },
          { status: 400 }
        );
      }

      const { data: existingBookings, error: existingBookingsError } = await serviceClient
        .from('bookings')
        .select('id, status')
        .eq('tour_id', tour_id)
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .limit(1);

      if (existingBookingsError) {
        console.error('Ошибка проверки бронирований:', existingBookingsError);
        return NextResponse.json(
          { error: 'Не удалось проверить бронирование' },
          { status: 500 }
        );
      }

      if ((existingBookings || []).length > 0) {
        return NextResponse.json(
          { error: 'У вас уже есть бронирование на этот тур' },
          { status: 400 }
        );
      }
    }

    // Сохраняем карту если нужно (только для новых карт, не для уже сохраненных)
    let cardId = payment_data?.card_id || null;
    
    if (save_card && payment_data && !payment_data.card_id) {
      try {
        // Если устанавливаем как default, снимаем default с других карт
        if (save_card.is_default) {
          await serviceClient
            .from('user_cards')
            .update({ is_default: false })
            .eq('user_id', user.id)
            .eq('is_default', true);
        }

        const { data: newCard, error: cardError } = await serviceClient
          .from('user_cards')
          .insert({
            user_id: user.id,
            last_four_digits: save_card.last_four_digits,
            card_type: save_card.card_type,
            cardholder_name: save_card.cardholder_name || null,
            is_default: save_card.is_default || false,
          })
          .select()
          .single();

        if (cardError) {
          console.error('Ошибка сохранения карты:', cardError);
          // Не прерываем выполнение, просто логируем ошибку
        } else if (newCard) {
          cardId = (newCard as any).id;
          console.log('Карта успешно сохранена:', cardId);
        }
      } catch (error) {
        console.error('Ошибка при сохранении карты:', error);
        // Не прерываем выполнение бронирования, если сохранение карты не удалось
      }
    }

    // Получаем данные пользователя и тура для email/участников
    const [userProfileResult, tourDataResult] = await Promise.all([
      serviceClient
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', user.id)
        .single(),
      serviceClient
        .from('tours')
        .select('title, start_date')
        .eq('id', tour_id)
        .single(),
    ]);

    const profileData = userProfileResult.data as any;
    const fullNameFromProfile =
      profileData?.first_name && profileData?.last_name
        ? `${profileData.first_name} ${profileData.last_name}`
        : profileData?.email || user.email;
    // Создаем бронирование
    // Когда билет создан, статус оплаты сразу "оплачен"
    const { data: booking, error: bookingError } = await (serviceClient as any)
      .from('bookings')
      .insert({
        user_id: user.id,
        tour_id,
        ...(session_id ? { session_id } : {}),
        booking_date: new Date().toISOString(),
        num_people,
        total_price,
        payment_method,
        payment_status: 'paid', // Билет создан = оплачен
        payment_data: {
          ...payment_data,
          card_id: cardId || payment_data?.card_id || null,
        },
        status: 'confirmed', // Подтверждено сразу, так как оплачено
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Ошибка создания бронирования:', bookingError);
      // 42P10: триггер/функция в БД использует ON CONFLICT без подходящего UNIQUE — см. database/migrations/004_booking_on_conflict_42p10.sql
      if (bookingError.code === '42P10') {
        return NextResponse.json(
          {
            error:
              'База: триггер при создании брони использует ON CONFLICT без подходящего индекса. Если индексы из database/migrations/004_booking_on_conflict_42p10.sql уже есть — выполните database/migrations/005_create_tour_room_trigger_no_on_conflict.sql в Supabase SQL Editor (переписывает create_tour_room_on_booking без ON CONFLICT).',
            code: bookingError.code,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          error: 'Не удалось создать бронирование',
          ...(process.env.NODE_ENV === 'development' && {
            debug: {
              code: bookingError.code,
              message: bookingError.message,
              hint: bookingError.hint,
            },
          }),
        },
        { status: 500 }
      );
    }

    let attendeesToInsert: Array<{
      booking_id: string;
      first_name: string;
      last_name: string;
      middle_name?: string | null;
      email?: string | null;
      phone?: string | null;
      passport_data?: string | null;
    }> = [];

    const parseFullName = (value: string) => {
      const parts = value.trim().split(/\s+/).filter(Boolean);
      const firstName = parts[0] || 'Неизвестно';
      const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Неизвестно';
      const middleName =
        parts.length > 2 ? parts.slice(1, -1).join(' ') : null;
      return { firstName, lastName, middleName };
    };

    if (attendees && Array.isArray(attendees)) {
      if (attendees.length !== num_people) {
        return NextResponse.json(
          { error: 'Количество участников не совпадает с выбранным количеством' },
          { status: 400 }
        );
      }

      const hasInvalid = attendees.some(
        (a: any) => !a?.full_name || String(a.full_name).trim().length < 2
      );
      if (hasInvalid) {
        return NextResponse.json(
          { error: 'Заполните ФИО для всех участников' },
          { status: 400 }
        );
      }

      attendeesToInsert = attendees.map((a: any) => {
        const fullName = String(a.full_name).trim();
        const parsed = parseFullName(fullName);
        return {
          booking_id: booking.id,
          first_name: parsed.firstName,
          last_name: parsed.lastName,
          middle_name: parsed.middleName,
          email: a.email || null,
          phone: a.phone || null,
          passport_data: a.passport_data || null,
        };
      });
    } else if (num_people === 1 && fullNameFromProfile) {
      const parsed = parseFullName(fullNameFromProfile);
      attendeesToInsert = [
        {
          booking_id: booking.id,
          first_name: parsed.firstName,
          last_name: parsed.lastName,
          middle_name: parsed.middleName,
          email: profileData?.email || user.email || null,
          phone: null,
          passport_data: null,
        },
      ];
    } else if (num_people > 1) {
      return NextResponse.json(
        { error: 'Укажите данные участников' },
        { status: 400 }
      );
    }

    if (attendeesToInsert.length > 0) {
      const { error: attendeesError } = await serviceClient
        .from('booking_attendees')
        .insert(attendeesToInsert);

      if (attendeesError) {
        console.error('Ошибка сохранения участников:', attendeesError);
        return NextResponse.json(
          { error: 'Не удалось сохранить участников' },
          { status: 500 }
        );
      }

      if (session_id && sessionRow) {
        const sr = sessionRow;
        const { error: participantsError } = await serviceClient
          .from('tour_sessions')
          .update({
            current_participants:
              (sr.current_participants ?? 0) + attendeesToInsert.length,
          })
          .eq('id', session_id);

        if (participantsError) {
          console.error('Ошибка обновления участников слота:', participantsError);
        }
      } else {
        const { error: participantsError } = await serviceClient
          .from('tours')
          .update({
            current_participants:
              ((tour as any).current_participants || 0) + attendeesToInsert.length,
          })
          .eq('id', tour_id);

        if (participantsError) {
          console.error('Ошибка обновления участников тура:', participantsError);
        }
      }
    }

    // Явно добавляем пользователя в участники комнаты тура (на случай если триггер не сработал)
    try {
      let roomId: string | undefined;

      if (session_id) {
        const { data: sessionGuideRow } = await serviceClient
          .from('tour_sessions')
          .select('guide_id')
          .eq('id', session_id)
          .eq('tour_id', tour_id)
          .maybeSingle();
        const guideFromSession =
          (sessionGuideRow as { guide_id?: string | null } | null)?.guide_id ?? null;

        const ensured = await ensureTourRoomForSession(serviceClient, {
          tourId: tour_id,
          sessionId: session_id,
          guideId: guideFromSession,
          createdBy: user.id,
        });
        roomId = ensured.roomId;
        if (!ensured.ok) {
          console.error('Ошибка комнаты слота:', ensured.error);
        }
      } else {
        const { data: legacyRoom } = await serviceClient
          .from('tour_rooms')
          .select('id')
          .eq('tour_id', tour_id)
          .is('tour_session_id', null)
          .maybeSingle();

        roomId = (legacyRoom as { id?: string } | null)?.id;

        if (!roomId) {
          const { data: newRoom, error: createRoomError } = await serviceClient
            .from('tour_rooms')
            .insert({
              tour_id,
              created_by: user.id,
            })
            .select('id')
            .single();

          if (createRoomError) {
            console.error('Ошибка создания комнаты:', createRoomError);
          } else if (newRoom) {
            roomId = (newRoom as { id: string }).id;
          }
        }
      }

      // Добавляем пользователя в участники комнаты
      if (roomId) {
        const { error: participantError } = await serviceClient
          .from('tour_room_participants')
          .insert({
            room_id: roomId,
            user_id: user.id,
            booking_id: booking.id,
          })
          .select()
          .single();

        if (participantError) {
          // Если уже существует - обновляем booking_id
          if (participantError.code === '23505') {
            await serviceClient
              .from('tour_room_participants')
              .update({ booking_id: booking.id })
              .eq('room_id', roomId)
              .eq('user_id', user.id);
          } else {
            console.error('Ошибка добавления в участники:', participantError);
          }
        }
      }
    } catch (participantError) {
      // Не прерываем выполнение если не удалось добавить в участники
      console.error('Ошибка добавления в участники комнаты:', participantError);
    }

    // Отправляем email уведомление о создании бронирования
    try {
      const userProfile = userProfileResult.data;
      const tourData = tourDataResult.data;

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

        const { sendEmail, getBookingConfirmationEmail } = await import('@/lib/email/send-email');
        await sendEmail({
          to: userProfile.email,
          subject: `Бронирование подтверждено: ${tourData.title}`,
          html: getBookingConfirmationEmail(
            userName,
            tourData.title,
            tourDate,
            num_people,
            parseFloat(total_price.toString())
          ),
        });
      }
    } catch (emailError) {
      // Не прерываем выполнение если email не отправился
      console.error('Ошибка отправки email уведомления:', emailError);
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Ошибка API бронирования:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

