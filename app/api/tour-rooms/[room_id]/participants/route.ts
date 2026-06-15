// API для работы с участниками комнат туров
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { syncGuideRoomParticipant } from '@/lib/tour-rooms/sync-guide-participant';
import { canBypassRoomParticipantCheck } from '@/lib/achievements/offline-issue-access';
import { dedupeParticipantsByUserId } from '@/lib/tour-rooms/dedupe-participants';
import { fetchMergedRoomParticipants } from '@/lib/tour-rooms/merged-room-participants';
import { requireTourRoomAccess } from '@/lib/tour-rooms/room-access';

// GET /api/tour-rooms/[room_id]/participants
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ room_id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const { room_id } = await params;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { scope, participants: mergedParticipants } = await fetchMergedRoomParticipants(
      serviceClient,
      room_id
    );

    if (!scope) {
      return NextResponse.json({ error: 'Комната не найдена' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const canViewAllParticipants =
      canBypassRoomParticipantCheck(profile?.role) || profile?.role === 'support_admin';

    const accessCheck = await requireTourRoomAccess(
      serviceClient,
      room_id,
      user.id,
      profile?.role
    );
    if (!accessCheck.allowed && !canViewAllParticipants) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status });
    }

    let participantsList = mergedParticipants;

    if (scope.guide_id && !participantsList.some((p) => p.user_id === scope.guide_id)) {
      await syncGuideRoomParticipant(serviceClient, scope.id, scope.guide_id, null);
      const refetched = await fetchMergedRoomParticipants(serviceClient, scope.id);
      participantsList = refetched.participants;
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
        participantsList = dedupeParticipantsByUserId([
          {
            id: `admin-viewer-${user.id}`,
            room_id: scope.id,
            user_id: user.id,
            booking_id: null,
            joined_at: new Date().toISOString(),
            user: selfProfile,
            booking: null,
          },
          ...participantsList,
        ]);
      }
    } else {
      participantsList = dedupeParticipantsByUserId(participantsList);
    }

    return NextResponse.json({
      success: true,
      participants: participantsList,
      guide_id: scope.guide_id,
      viewer_role: profile?.role ?? null,
    });
  } catch (error) {
    console.error('Ошибка получения участников:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
