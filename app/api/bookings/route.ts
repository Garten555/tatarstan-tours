// API для создания бронирования
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
      num_people,
      total_price,
      payment_method,
      payment_data,
      save_card,
      attendees,
    } = bookingData;

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

    // Проверяем, есть ли уже бронирование этого тура у пользователя
    const { data: existingBookings, error: existingBookingsError } = await serviceClient
      .from('bookings')
      .select('id, status')
      .eq('tour_id', tour_id)
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .limit(1);

    if (existingBookingsError) {
      console.error('Ошибка проверки бронирований:', existingBookingsError);
      return NextResponse.json(
        { error: 'Не удалось проверить бронирование' },
        { status: 500 }
      );
    }

    const hasExistingBooking = (existingBookings || []).length > 0;

    // Проверяем даты тура
    const now = new Date();
    const startDate = new Date((tour as any).start_date);
    const endDate = (tour as any).end_date ? new Date((tour as any).end_date) : null;

    // Тур уже закончился (если есть end_date)
    if (endDate && endDate <= now) {
      return NextResponse.json(
        { error: 'Бронирование недоступно: тур уже закончился' },
        { status: 400 }
      );
    }

    const availableSpots = (tour as any).max_participants - ((tour as any).current_participants || 0);
    if (num_people > availableSpots) {
      return NextResponse.json(
        { error: `Доступно только ${availableSpots} мест` },
        { status: 400 }
      );
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
    const normalizedProfileName = fullNameFromProfile?.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedProfileEmail = (profileData?.email || user.email || '').toLowerCase();

    if (hasExistingBooking) {
      if (!attendees && num_people === 1) {
        return NextResponse.json(
          { error: 'У вас уже есть билет. Для повторного бронирования укажите другого участника.' },
          { status: 400 }
        );
      }

      if (attendees && Array.isArray(attendees)) {
        const includesSelf = attendees.some((a: any) => {
          if (a?.source === 'self') return true;
          const name = String(a?.full_name || '').toLowerCase().replace(/\s+/g, ' ').trim();
          const email = String(a?.email || '').toLowerCase();
          if (normalizedProfileEmail && email && email === normalizedProfileEmail) {
            return true;
          }
          if (!email && normalizedProfileName && name && name === normalizedProfileName) {
            return true;
          }
          return false;
        });
        if (includesSelf) {
          return NextResponse.json(
            { error: 'У вас уже есть билет. Для повторного бронирования выберите других участников.' },
            { status: 400 }
          );
        }
      }
    }

    // Создаем бронирование
    // Когда билет создан, статус оплаты сразу "оплачен"
    const { data: booking, error: bookingError } = await (serviceClient as any)
      .from('bookings')
      .insert({
        user_id: user.id,
        tour_id,
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
      return NextResponse.json(
        { error: 'Не удалось создать бронирование' },
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

    // Явно добавляем пользователя в участники комнаты тура (на случай если триггер не сработал)
    try {
      // Получаем или создаем комнату для тура
      const { data: room, error: roomError } = await serviceClient
        .from('tour_rooms')
        .select('id')
        .eq('tour_id', tour_id)
        .single();

      let roomId = room?.id;

      // Если комнаты нет - создаем
      if (roomError || !roomId) {
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
          roomId = newRoom.id;
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

