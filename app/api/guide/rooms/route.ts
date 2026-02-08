// API для получения комнат гида
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/guide/rooms
// Получить комнаты где пользователь является гидом
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

    // Получаем комнаты где пользователь является гидом
    const { data: rooms, error: roomsError } = await serviceClient
      .from('tour_rooms')
      .select(`
        *,
        tour:tours(
          id,
          title,
          start_date,
          end_date,
          city:cities(name)
        )
      `)
      .eq('guide_id', user.id)
      .order('created_at', { ascending: false });

    if (roomsError) {
      console.error('Ошибка получения комнат гида:', roomsError);
      return NextResponse.json(
        { error: 'Не удалось получить комнаты' },
        { status: 500 }
      );
    }

    // Если нет комнат - возвращаем пустой массив (не ошибку)
    if (!rooms || rooms.length === 0) {
      return NextResponse.json({
        success: true,
        rooms: [],
      });
    }

    // Оптимизация: получаем все счетчики участников одним запросом (исправление N+1)
    const roomIds = rooms.map((r: any) => r.id);
    let participantsCounts: Record<string, number> = {};
    
    if (roomIds.length > 0) {
      const { data: participantsData } = await serviceClient
        .from('tour_room_participants')
        .select('room_id')
        .in('room_id', roomIds);
      
      // Подсчитываем в памяти
      participantsCounts = (participantsData || []).reduce((acc: Record<string, number>, p: any) => {
        acc[p.room_id] = (acc[p.room_id] || 0) + 1;
        return acc;
      }, {});
    }

    // Добавляем счетчики к комнатам
    const roomsWithCounts = rooms.map((room: any) => ({
      ...room,
      participants_count: participantsCounts[room.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      rooms: roomsWithCounts,
    });
  } catch (error) {
    console.error('Ошибка получения комнат гида:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

