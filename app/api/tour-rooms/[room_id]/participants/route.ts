// API для работы с участниками комнат туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { syncGuideRoomParticipant } from '@/lib/tour-rooms/sync-guide-participant';
import { canBypassRoomParticipantCheck } from '@/lib/achievements/offline-issue-access';
import { dedupeParticipantsByUserId } from '@/lib/tour-rooms/dedupe-participants';

// GET /api/tour-rooms/[room_id]/participants
// Получить список участников
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

    // Получаем комнату для проверки guide_id и tour_id
    const { data: room } = await serviceClient
      .from('tour_rooms')
      .select('guide_id, tour_id')
      .eq('id', room_id)
      .single();

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

    const canViewAllParticipants =
      canBypassRoomParticipantCheck(profile?.role) ||
      profile?.role === 'support_admin';
    const isGuide = room?.guide_id === user.id;
    const isParticipant = !!participant;

    if (!isParticipant && !isGuide && !canViewAllParticipants) {
      return NextResponse.json(
        { error: 'У вас нет доступа к этой комнате' },
        { status: 403 }
      );
    }

    // Получаем участников
    // Оптимизировано: выбираем только нужные поля
    const { data: participants, error: participantsError } = await serviceClient
      .from('tour_room_participants')
      .select(`
        id,
        room_id,
        user_id,
        booking_id,
        joined_at,
        user:profiles(id, first_name, last_name, avatar_url, email, role),
        booking:bookings(id, num_people, status)
      `)
      .eq('room_id', room_id)
      .order('joined_at', { ascending: true })
      .limit(100); // Ограничиваем количество для производительности

    if (participantsError) {
      console.error('Ошибка получения участников:', participantsError);
      return NextResponse.json(
        { error: 'Не удалось получить участников' },
        { status: 500 }
      );
    }

    let participantsList = dedupeParticipantsByUserId(participants || []);

    if (room?.guide_id) {
      const guideAlreadyListed = participantsList.some(
        (p) => p.user_id === room.guide_id
      );

      if (!guideAlreadyListed) {
        await syncGuideRoomParticipant(
          serviceClient,
          room_id,
          room.guide_id,
          null
        );

        const { data: refetched } = await serviceClient
          .from('tour_room_participants')
          .select(`
            id,
            room_id,
            user_id,
            booking_id,
            joined_at,
            user:profiles(id, first_name, last_name, avatar_url, email, role),
            booking:bookings(id, num_people, status)
          `)
          .eq('room_id', room_id)
          .order('joined_at', { ascending: true })
          .limit(100);

        if (refetched) {
          participantsList = dedupeParticipantsByUserId(refetched);
        }
      }
    }

    if (
      canBypassRoomParticipantCheck(profile?.role) &&
      !participantsList.some((p) => p.user_id === user.id)
    ) {
      const { data: selfProfile } = await serviceClient
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, email, role')
        .eq('id', user.id)
        .maybeSingle();

      if (selfProfile) {
        const selfRow = {
          id: `admin-viewer-${user.id}`,
          room_id,
          user_id: user.id,
          booking_id: null,
          joined_at: new Date().toISOString(),
          user: selfProfile,
          booking: null,
        };
        participantsList = dedupeParticipantsByUserId([
          selfRow,
          ...participantsList,
        ] as typeof participantsList);
      }
    } else {
      participantsList = dedupeParticipantsByUserId(participantsList);
    }

    return NextResponse.json({
      success: true,
      participants: participantsList,
      guide_id: room?.guide_id || null,
      viewer_role: profile?.role ?? null,
    });
  } catch (error) {
    console.error('Ошибка получения участников:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

