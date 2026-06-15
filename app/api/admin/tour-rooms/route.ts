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

    interface Profile {
      role?: string;
    }
    const profileRole = (profile as Profile | null)?.role;
    if (
      profileRole !== 'tour_admin' &&
      profileRole !== 'super_admin' &&
      profileRole !== 'support_admin'
    ) {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    // Получаем комнаты с данными туров, слотов и гидов (без лишних полей)
    const { data: rooms, error: roomsError } = await serviceClient
      .from('tour_rooms')
      .select(`
        id,
        tour_id,
        tour_session_id,
        guide_id,
        is_active,
        created_at,
        tour:tours(
          id,
          slug,
          title,
          start_date,
          end_date,
          cover_image,
          city:cities(name)
        ),
        session:tour_sessions!tour_rooms_tour_session_id_fkey(
          id,
          start_at,
          end_at
        ),
        guide:profiles!tour_rooms_guide_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        participants:tour_room_participants(count)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (roomsError) {
      console.error('Ошибка получения комнат:', roomsError);
      return NextResponse.json(
        { error: 'Не удалось получить комнаты' },
        { status: 500 }
      );
    }

    interface RoomData {
      id: string;
      [key: string]: unknown;
    }

    // Добавляем счетчики к комнатам
    const roomsWithCounts = (rooms || []).map((room: RoomData) => {
      const rawSession = (room as { session?: unknown }).session;
      const session = Array.isArray(rawSession) ? rawSession[0] ?? null : rawSession;
      const rawParticipants = (room as { participants?: { count?: unknown }[] | null }).participants;
      let participants_count = 0;
      if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
        const n = rawParticipants[0]?.count;
        participants_count =
          typeof n === 'number' ? n : typeof n === 'string' ? parseInt(n, 10) || 0 : 0;
      }
      const { participants: _drop, ...rest } = room as RoomData & { participants?: unknown };
      return {
        ...rest,
        session,
        participants_count,
      };
    });

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
    const { tour_id, tour_session_id } = body as {
      tour_id?: string;
      tour_session_id?: string | null;
    };

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

    if (typeof tour_session_id === 'string' && tour_session_id.length > 0) {
      const { data: sRow } = await serviceClient
        .from('tour_sessions')
        .select('id')
        .eq('id', tour_session_id)
        .eq('tour_id', tour_id)
        .maybeSingle();
      if (!sRow) {
        return NextResponse.json({ error: 'Слот тура не найден' }, { status: 400 });
      }
      const { data: existingSlotRoom } = await serviceClient
        .from('tour_rooms')
        .select('id')
        .eq('tour_session_id', tour_session_id)
        .maybeSingle();
      if (existingSlotRoom) {
        return NextResponse.json(
          { error: 'Комната для этого выезда уже существует' },
          { status: 400 }
        );
      }
    } else {
      const { data: existingLegacy } = await serviceClient
        .from('tour_rooms')
        .select('id')
        .eq('tour_id', tour_id)
        .is('tour_session_id', null)
        .maybeSingle();

      if (existingLegacy) {
        return NextResponse.json(
          { error: 'Общая комната для этого тура уже существует; укажите tour_session_id для нового выезда' },
          { status: 400 }
        );
      }
    }

    // Создаем комнату
    const { data: newRoom, error: createError } = await serviceClient
      .from('tour_rooms')
      .insert({
        tour_id: tour_id,
        ...(typeof tour_session_id === 'string' && tour_session_id.length > 0
          ? { tour_session_id }
          : {}),
        created_by: user.id,
      })
      .select(`
        *,
        tour:tours(
          id,
          slug,
          title,
          start_date,
          end_date,
          cover_image,
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

