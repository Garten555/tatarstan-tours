// API для работы с комнатами туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { publishAdminSync, publishUserNotification } from '@/lib/pusher/user-notification';
import { ensureTourRoomForSession } from '@/lib/tour/ensure-session-room';

// GET /api/tour-rooms?tour_id={tour_id}&session_id={optional}
// Комната тура: для нескольких выездов передавайте session_id слота брони.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    // Проверка авторизации
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

    const searchParams = request.nextUrl.searchParams;
    const tourId = searchParams.get('tour_id');
    const sessionIdParam = searchParams.get('session_id');

    if (!tourId) {
      return NextResponse.json(
        { error: 'Не указан tour_id' },
        { status: 400 }
      );
    }

    const session_id =
      typeof sessionIdParam === 'string' && sessionIdParam.length > 0 ? sessionIdParam : null;

    let bookingQuery = serviceClient
      .from('bookings')
      .select('id, status, session_id')
      .eq('tour_id', tourId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed');

    if (session_id) {
      bookingQuery = bookingQuery.eq('session_id', session_id);
    } else {
      bookingQuery = bookingQuery.is('session_id', null);
    }

    const { data: booking } = await bookingQuery.maybeSingle();

    // Проверяем права админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin =
      profile?.role === 'tour_admin' ||
      profile?.role === 'super_admin' ||
      profile?.role === 'support_admin';

    let room:
      | Record<string, unknown>
      | null = null;
    let roomError: { message?: string } | null = null;

    if (session_id) {
      const res = await serviceClient
        .from('tour_rooms')
        .select(`
        *,
        tour:tours(id, title, start_date, end_date),
        guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url),
        participants:tour_room_participants(
          id,
          user:profiles(id, first_name, last_name, avatar_url)
        )
      `)
        .eq('tour_session_id', session_id)
        .maybeSingle();
      room = res.data as Record<string, unknown> | null;
      roomError = res.error;
    } else {
      const res = await serviceClient
        .from('tour_rooms')
        .select(`
        *,
        tour:tours(id, title, start_date, end_date),
        guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url),
        participants:tour_room_participants(
          id,
          user:profiles(id, first_name, last_name, avatar_url)
        )
      `)
        .eq('tour_id', tourId)
        .is('tour_session_id', null)
        .maybeSingle();
      room = res.data as Record<string, unknown> | null;
      roomError = res.error;
    }

    // Проверяем доступ: бронирование, гид или админ
    const isGuide = room && (room as { guide_id?: string }).guide_id === user.id;

    // Если нет бронирования, не гид и не админ - доступ запрещен
    if (!booking && !isGuide && !isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
    }

    // Если комнаты нет - создаем (если есть confirmed бронирование или пользователь - админ)
    if ((roomError || !room) && (booking || isAdmin)) {
      let newRoom: Record<string, unknown> | null = null;
      let createError: { message?: string } | null = null;

      if (session_id) {
        const { data: sessRow } = await serviceClient
          .from('tour_sessions')
          .select('guide_id')
          .eq('id', session_id)
          .maybeSingle();
        const gid = (sessRow as { guide_id?: string | null } | null)?.guide_id ?? null;
        const ensured = await ensureTourRoomForSession(serviceClient, {
          tourId,
          sessionId: session_id,
          guideId: gid,
          createdBy: user.id,
        });
        if (ensured.roomId) {
          const loaded = await serviceClient
            .from('tour_rooms')
            .select(`
              *,
              tour:tours(id, title, start_date, end_date),
              guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url)
            `)
            .eq('id', ensured.roomId)
            .single();
          newRoom = loaded.data as Record<string, unknown> | null;
          createError = loaded.error;
        } else {
          createError = { message: ensured.error };
        }
      } else {
        const ins = await serviceClient
          .from('tour_rooms')
          .insert({
            tour_id: tourId,
            created_by: user.id,
          })
          .select(`
          *,
          tour:tours(id, title, start_date, end_date),
          guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url)
        `)
          .single();
        newRoom = ins.data as Record<string, unknown> | null;
        createError = ins.error;
      }

      if (createError && !newRoom) {
        console.error('Ошибка создания комнаты:', createError);
        return NextResponse.json(
          { error: 'Не удалось создать комнату' },
          { status: 500 }
        );
      }

      // Добавляем пользователя в участники только если есть бронирование
      if (booking && newRoom?.id) {
        await serviceClient
          .from('tour_room_participants')
          .insert({
            room_id: newRoom.id as string,
            user_id: user.id,
            booking_id: booking.id,
          });
      }

      room = newRoom;
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Ошибка получения комнаты:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH /api/tour-rooms/{room_id}
// Обновить комнату (назначить гида, деактивировать)
// Только для админов
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    // Проверка авторизации
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

    // Проверяем права админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      profile?.role !== 'tour_admin' &&
      profile?.role !== 'super_admin' &&
      profile?.role !== 'support_admin'
    ) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get('room_id') || searchParams.get('id');
    
    // Получаем body
    let bodyData: any = {};
    try {
      bodyData = await request.json();
    } catch {
      // Игнорируем ошибку если body пустой
    }
    
    const finalRoomId = roomId || bodyData.room_id || bodyData.id;

    if (!finalRoomId) {
      return NextResponse.json(
        { error: 'Не указан room_id' },
        { status: 400 }
      );
    }

    const { guide_id, is_active } = bodyData;

    // Получаем текущую комнату для проверки старого гида
    const { data: currentRoom } = await serviceClient
      .from('tour_rooms')
      .select(`
        guide_id,
        tour_session_id,
        tour:tours(id, title, start_date, end_date)
      `)
      .eq('id', finalRoomId)
      .single();

    const typedCurrent = currentRoom as {
      guide_id?: string | null;
      tour_session_id?: string | null;
      tour?: { title?: string; start_date?: string };
    } | null;

    // Обновляем комнату
    const { data: room, error: updateError } = await serviceClient
      .from('tour_rooms')
      .update({
        ...(guide_id !== undefined && { guide_id }),
        ...(is_active !== undefined && { is_active }),
      })
      .eq('id', finalRoomId)
      .select(`
        *,
        tour:tours(id, title, start_date, end_date),
        guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('Ошибка обновления комнаты:', updateError);
      return NextResponse.json(
        { error: 'Не удалось обновить комнату' },
        { status: 500 }
      );
    }

    if (
      guide_id !== undefined &&
      typedCurrent?.tour_session_id
    ) {
      await serviceClient
        .from('tour_sessions')
        .update({ guide_id })
        .eq('id', typedCurrent.tour_session_id);
    }

    // Отправляем уведомления при изменении гида
    if (guide_id !== undefined && guide_id !== typedCurrent?.guide_id) {
      const tour = room?.tour || typedCurrent?.tour;
      const tourTitle = tour?.title || 'тур';
      const tourDate = tour?.start_date 
        ? new Date(tour.start_date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        : '';

      // Уведомление старому гиду о снятии (если был назначен другой гид или снят)
      if (typedCurrent?.guide_id && typedCurrent.guide_id !== guide_id) {
        try {
          const { data: notification, error: notificationError } = await serviceClient
            .from('notifications')
            .insert({
              user_id: typedCurrent.guide_id,
              title: 'Вас сняли с тура',
              body: `Вас сняли с роли гида для тура "${tourTitle}"${tourDate ? `, который должен был состояться ${tourDate}` : ''}.`,
              type: 'warning',
            })
            .select('id, user_id, title, body, type, created_at')
            .single();
          
          if (!notificationError && notification) {
            console.log(`Уведомление отправлено старому гиду ${typedCurrent.guide_id} о снятии с тура ${tourTitle}`);
            await publishUserNotification(typedCurrent.guide_id, notification);
          }
        } catch (notificationError) {
          console.error('Ошибка отправки уведомления старому гиду:', notificationError);
        }
      }

      // Уведомление новому гиду о назначении
      if (guide_id !== null && guide_id !== typedCurrent?.guide_id) {
        try {
          const { data: notification, error: notificationError } = await serviceClient
            .from('notifications')
            .insert({
              user_id: guide_id,
              title: 'Вас назначили гидом',
              body: `Вы были назначены гидом для тура "${tourTitle}"${tourDate ? `, который состоится ${tourDate}` : ''}. Перейдите в админ-панель для управления группой.`,
              type: 'info',
            })
            .select('id, user_id, title, body, type, created_at')
            .single();
          
          if (!notificationError && notification) {
            console.log(`Уведомление отправлено новому гиду ${guide_id} о назначении на тур ${tourTitle}`);
            await publishUserNotification(guide_id, notification);
          }
        } catch (notificationError) {
          console.error('Ошибка отправки уведомления новому гиду:', notificationError);
        }
      }

      if (typedCurrent?.guide_id && typedCurrent.guide_id !== guide_id) {
        await publishAdminSync(typedCurrent.guide_id, {
          kind: 'guide_rooms',
          reason: guide_id ? 'reassigned' : 'removed',
          roomId: finalRoomId,
        });
      }
      if (guide_id && guide_id !== typedCurrent?.guide_id) {
        await publishAdminSync(guide_id, {
          kind: 'guide_rooms',
          reason: 'reassigned',
          roomId: finalRoomId,
        });
      }
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Ошибка обновления комнаты:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

