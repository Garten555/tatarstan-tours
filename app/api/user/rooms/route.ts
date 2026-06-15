// API для получения всех комнат пользователя (как участника и как гида)
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { loadGuideTourRooms } from '@/lib/admin/guide-tour-room-rows';
import { parseEmbeddedSession } from '@/lib/achievements/dedupe-award-rooms';

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

    const [participantResult, guideRoomsLoaded] = await Promise.all([
      serviceClient
        .from('tour_room_participants')
        .select('room_id')
        .eq('user_id', user.id)
        .then(async (result) => {
          if (result.error || !result.data || result.data.length === 0) {
            return { data: [], error: result.error };
          }
          const roomIds = result.data.map((p: { room_id: string }) => p.room_id);
          const roomsResult = await serviceClient
            .from('tour_rooms')
            .select(`
              id,
              tour_id,
              tour_session_id,
              guide_id,
              is_active,
              created_at,
              session:tour_sessions!tour_rooms_tour_session_id_fkey(start_at, end_at),
              tour:tours(id, title, slug, start_date, end_date, cover_image),
              guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url)
            `)
            .in('id', roomIds);

          if (roomsResult.data) {
            const tourIds = (roomsResult.data as { tour?: { id?: string } | { id?: string }[] | null }[])
              .map((r) => {
                const t = r.tour;
                if (Array.isArray(t)) return t[0]?.id;
                return t?.id;
              })
              .filter(Boolean) as string[];
            if (tourIds.length > 0) {
              const { data: toursWithCities } = await serviceClient
                .from('tours')
                .select('id, city:cities(name)')
                .in('id', tourIds);

              if (toursWithCities) {
                const cityMap = new Map(
                  toursWithCities.map((t: { id: string; city?: unknown }) => [t.id, t.city])
                );
                for (const room of roomsResult.data as { tour?: { id?: string; city?: unknown } | null }[]) {
                  if (room.tour && !Array.isArray(room.tour) && room.tour.id) {
                    room.tour.city = cityMap.get(room.tour.id);
                  }
                }
              }
            }
          }

          return {
            data:
              roomsResult.data?.map((r: { id: string }) => ({
                room_id: r.id,
                room: r,
              })) || [],
            error: roomsResult.error,
          };
        }),
      loadGuideTourRooms(serviceClient, { guideId: user.id, limit: 100 }),
    ]);

    const participantRooms = participantResult.data || [];
    const roomsMap = new Map<string, Record<string, unknown>>();

    for (const pr of participantRooms) {
      const row = pr as { room?: Record<string, unknown> & { id?: string; session?: unknown } };
      if (row?.room?.id) {
        const sessionEmbed = parseEmbeddedSession(
          row.room.session as Parameters<typeof parseEmbeddedSession>[0]
        );
        roomsMap.set(String(row.room.id), {
          ...row.room,
          session_start_at: sessionEmbed.start_at,
          session_end_at: sessionEmbed.end_at,
          role: 'participant',
        });
      }
    }

    for (const gr of guideRoomsLoaded) {
      roomsMap.set(gr.id, {
        id: gr.id,
        tour_id: gr.tour_id,
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

    const roomIds = Array.from(roomsMap.keys());
    let participantsCounts: Record<string, number> = {};

    if (roomIds.length > 0) {
      const needsCount = [...roomsMap.values()].some(
        (r) => typeof r.participants_count !== 'number'
      );
      if (needsCount) {
        const { data: participantsData } = await serviceClient
          .from('tour_room_participants')
          .select('room_id')
          .in('room_id', roomIds);

        if (participantsData) {
          for (const p of participantsData as { room_id: string }[]) {
            participantsCounts[p.room_id] = (participantsCounts[p.room_id] || 0) + 1;
          }
        }
      }
    }

    const rooms = Array.from(roomsMap.values())
      .filter((room) => room && room.id)
      .map((room) => {
        const id = String(room.id);
        const tour = room.tour as Record<string, unknown> | null | undefined;
        const sessionStart = room.session_start_at as string | null | undefined;
        const sessionEnd = room.session_end_at as string | null | undefined;
        const displayStart =
          sessionStart ||
          (tour?.start_date ? String(tour.start_date) : null);

        return {
          id,
          tour_id: room.tour_id,
          guide_id: room.guide_id ?? null,
          is_active: room.is_active,
          created_at: room.created_at || new Date().toISOString(),
          role: room.role,
          tour: tour
            ? {
                ...tour,
                start_date: displayStart ?? tour.start_date,
              }
            : null,
          guide: room.guide ?? null,
          participants_count:
            typeof room.participants_count === 'number'
              ? room.participants_count
              : participantsCounts[id] || 0,
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

    return NextResponse.json({
      success: true,
      rooms: sortedRooms,
    });
  } catch (error) {
    console.error('Ошибка получения комнат пользователя:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
