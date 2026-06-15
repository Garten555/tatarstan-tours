// API для получения конкретной комнаты по ID
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourRoomAccess } from '@/lib/tour-rooms/room-access';
import { loadTourRoomDisplayFields } from '@/lib/tour-rooms/room-display';

// GET /api/tour-rooms/[room_id]
// Получить комнату по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { room_id } = await params;

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

    // Получаем комнату
    const { data: room, error: roomError } = await serviceClient
      .from('tour_rooms')
      .select(`
        *,
        tour:tours(id, title, start_date, end_date, cover_image, city:cities(name)),
        session:tour_sessions!tour_rooms_tour_session_id_fkey(start_at, end_at),
        guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url),
        participants:tour_room_participants(
          id,
          user:profiles(id, first_name, last_name, avatar_url)
        )
      `)
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Комната не найдена' },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const accessCheck = await requireTourRoomAccess(
      serviceClient,
      room_id,
      user.id,
      profile?.role
    );
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.error },
        { status: accessCheck.status }
      );
    }

    const displayFields = await loadTourRoomDisplayFields(
      serviceClient,
      room_id,
      (room as { session?: unknown }).session
    );

    return NextResponse.json({
      success: true,
      room: { ...room, ...displayFields },
    });
  } catch (error) {
    console.error('Ошибка получения комнаты:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

