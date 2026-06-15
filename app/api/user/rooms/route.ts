// API для получения всех комнат пользователя (как участника и как гида)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { loadGuideTourRooms } from '@/lib/admin/guide-tour-room-rows';
import { parseEmbeddedSession } from '@/lib/achievements/dedupe-award-rooms';
import {
  getTourRoomNotificationSummary,
  mapUnreadCountsToDisplayedRooms,
} from '@/lib/notifications/tour-room-notification-summary';

const PARTICIPANT_ROOM_SELECT = `
  id,
  tour_id,
  tour_session_id,
  guide_id,
  is_active,
  created_at,
  session:tour_sessions!tour_rooms_tour_session_id_fkey(start_at, end_at),
  tour:tours(id, title, slug, start_date, end_date, cover_image, city:cities(name)),
  guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url),
  participants:tour_room_participants(count)
`;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const [participantLinks, guideRoomsLoaded, notificationSummary] = await Promise.all([
      serviceClient
        .from('tour_room_participants')
        .select('room_id')
        .eq('user_id', user.id),
      loadGuideTourRooms(serviceClient, {
        guideId: user.id,
        limit: 100,
        resolveCanonical: false,
      }),
      getTourRoomNotificationSummary(serviceClient, user.id),
    ]);

    const participantRoomIds = (participantLinks.data ?? []).map(
      (p: { room_id: string }) => p.room_id
    );

    let participantRoomsData: Record<string, unknown>[] = [];
    if (participantRoomIds.length > 0) {
      const { data, error } = await serviceClient
        .from('tour_rooms')
        .select(PARTICIPANT_ROOM_SELECT)
        .in('id', participantRoomIds);

      if (error) {
        console.error('[user/rooms] participant load:', error.message);
      } else {
        participantRoomsData = (data ?? []) as Record<string, unknown>[];
      }
    }

    const roomsMap = new Map<string, Record<string, unknown>>();

    for (const row of participantRoomsData) {
      const id = row.id ? String(row.id) : '';
      if (!id) continue;

      const sessionEmbed = parseEmbeddedSession(
        row.session as Parameters<typeof parseEmbeddedSession>[0]
      );

      let participants_count = 0;
      const rawParticipants = row.participants as { count?: unknown }[] | null | undefined;
      if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
        const n = rawParticipants[0]?.count;
        participants_count =
          typeof n === 'number' ? n : typeof n === 'string' ? parseInt(n, 10) || 0 : 0;
      }

      const rawTour = row.tour;
      const tour = Array.isArray(rawTour) ? rawTour[0] : rawTour;
      const rawGuide = row.guide;
      const guide = Array.isArray(rawGuide) ? rawGuide[0] : rawGuide;

      roomsMap.set(id, {
        ...row,
        tour,
        guide: guide ?? null,
        session_start_at: sessionEmbed.start_at,
        session_end_at: sessionEmbed.end_at,
        tour_session_id: row.tour_session_id ?? null,
        role: 'participant',
        participants_count,
      });
    }

    for (const gr of guideRoomsLoaded) {
      roomsMap.set(gr.id, {
        id: gr.id,
        tour_id: gr.tour_id,
        tour_session_id: gr.tour_session_id,
        guide_id: gr.guide_id,
        is_active: gr.is_active,
        created_at: gr.created_at,
        session_start_at: gr.session_start_at,
        session_end_at: gr.session_end_at,
        tour: {
          ...gr.tour,
          slug: (gr.tour as { slug?: string }).slug ?? '',
        },
        guide: null,
        role: 'guide',
        participants_count: gr.participants_count,
      });
    }

    const rooms = Array.from(roomsMap.values())
      .filter((room) => room && room.id)
      .map((room) => {
        const id = String(room.id);
        const tour = room.tour as Record<string, unknown> | null | undefined;
        const sessionStart = room.session_start_at as string | null | undefined;
        const sessionEnd = room.session_end_at as string | null | undefined;
        const displayStart =
          sessionStart || (tour?.start_date ? String(tour.start_date) : null);

        const cityRaw = tour?.city;
        const city =
          Array.isArray(cityRaw) && cityRaw[0]
            ? { name: String((cityRaw[0] as { name: unknown }).name) }
            : cityRaw && !Array.isArray(cityRaw)
              ? { name: String((cityRaw as { name: unknown }).name) }
              : null;

        return {
          id,
          tour_id: room.tour_id,
          tour_session_id: (room.tour_session_id as string | null | undefined) ?? null,
          guide_id: room.guide_id ?? null,
          is_active: room.is_active,
          created_at: room.created_at || new Date().toISOString(),
          role: room.role,
          tour: tour
            ? {
                ...tour,
                start_date: displayStart ?? tour.start_date,
                city,
              }
            : null,
          guide: room.guide ?? null,
          participants_count:
            typeof room.participants_count === 'number' ? room.participants_count : 0,
          session_start_at: sessionStart ?? null,
          session_end_at: sessionEnd ?? null,
        };
      });

    const sortedRooms = rooms.sort((a, b) => {
      const aStart = a.tour?.start_date
        ? new Date(String(a.tour.start_date)).getTime()
        : new Date(String(a.created_at)).getTime();
      const bStart = b.tour?.start_date
        ? new Date(String(b.tour.start_date)).getTime()
        : new Date(String(b.created_at)).getTime();
      return bStart - aStart;
    });

    const unreadByRoom = await mapUnreadCountsToDisplayedRooms(
      serviceClient,
      sortedRooms.map((r) => ({
        id: r.id,
        tour_session_id: r.tour_session_id as string | null,
      })),
      notificationSummary.room_counts
    );

    return NextResponse.json({
      success: true,
      rooms: sortedRooms,
      unread_by_room: unreadByRoom,
      unread_total: notificationSummary.tour_room_message,
    });
  } catch (error) {
    console.error('Ошибка получения комнат пользователя:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
