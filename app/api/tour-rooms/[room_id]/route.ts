// API для получения конкретной комнаты по ID
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
        tour:tours(id, title, start_date, end_date),
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

    // Проверяем доступ к комнате: участник, гид или админ
    const { data: participant } = await serviceClient
      .from('tour_room_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .single();

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
    const isGuide = (room as any).guide_id === user.id;
    const isParticipant = !!participant;

    // Если не участник, не гид и не админ - доступ запрещен
    if (!isParticipant && !isGuide && !isAdmin) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
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

