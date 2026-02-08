// API для получения всех комнат туров (для админов)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/admin/tour-rooms
// Получить все комнаты туров (только для админов)
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

    // Проверяем права админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      (profile as any)?.role !== 'tour_admin' &&
      (profile as any)?.role !== 'super_admin' &&
      (profile as any)?.role !== 'support_admin'
    ) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    // Получаем все комнаты с данными туров и гидов
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
        ),
        guide:profiles!tour_rooms_guide_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (roomsError) {
      console.error('Ошибка получения комнат:', roomsError);
      return NextResponse.json(
        { error: 'Не удалось получить комнаты' },
        { status: 500 }
      );
    }

    // Оптимизация: получаем все счетчики участников одним запросом
    const roomIds = (rooms || []).map((r: any) => r.id);
    let participantsCounts: Record<string, number> = {};
    
    if (roomIds.length > 0) {
      // Получаем количество участников для всех комнат одним запросом
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
    const roomsWithCounts = (rooms || []).map((room: any) => ({
      ...room,
      participants_count: participantsCounts[room.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      rooms: roomsWithCounts,
    });
  } catch (error) {
    console.error('Ошибка получения комнат:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tour-rooms
// Создать комнату для тура (только для админов)
export async function POST(request: NextRequest) {
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
      (profile as any)?.role !== 'tour_admin' &&
      (profile as any)?.role !== 'super_admin' &&
      (profile as any)?.role !== 'support_admin'
    ) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tour_id } = body;

    if (!tour_id) {
      return NextResponse.json(
        { error: 'Не указан tour_id' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли тур
    const { data: tour, error: tourError } = await serviceClient
      .from('tours')
      .select('id')
      .eq('id', tour_id)
      .single();

    if (tourError || !tour) {
      return NextResponse.json(
        { error: 'Тур не найден' },
        { status: 404 }
      );
    }

    // Проверяем, не существует ли уже комната для этого тура
    const { data: existingRoom } = await serviceClient
      .from('tour_rooms')
      .select('id')
      .eq('tour_id', tour_id)
      .maybeSingle();

    if (existingRoom) {
      return NextResponse.json(
        { error: 'Комната для этого тура уже существует' },
        { status: 400 }
      );
    }

    // Создаем комнату
    const { data: newRoom, error: createError } = await serviceClient
      .from('tour_rooms')
      .insert({
        tour_id: tour_id,
        created_by: user.id,
      })
      .select(`
        *,
        tour:tours(
          id,
          title,
          start_date,
          end_date,
          city:cities(name)
        ),
        guide:profiles!tour_rooms_guide_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (createError) {
      console.error('Ошибка создания комнаты:', createError);
      return NextResponse.json(
        { error: 'Не удалось создать комнату' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room: newRoom,
    });
  } catch (error) {
    console.error('Ошибка создания комнаты:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

