import type { SupabaseClient } from '@supabase/supabase-js';
import {
  assignOrphanRoomsToGuideSessions,
  dedupeAwardRooms,
  enrichRoomsWithSessionDates,
  parseEmbeddedSession,
} from '@/lib/achievements/dedupe-award-rooms';

const GUIDE_ROOM_SELECT = `
  id,
  tour_id,
  tour_session_id,
  guide_id,
  is_active,
  created_at,
  tour:tours(
    id,
    title,
    start_date,
    end_date,
    cover_image,
    city:cities(name)
  ),
  session:tour_sessions!tour_rooms_tour_session_id_fkey(start_at, end_at),
  participants:tour_room_participants(count)
`;

export { GUIDE_ROOM_SELECT };

export type MappedGuideTourRoom = {
  id: string;
  tour_id: string;
  tour_session_id: string | null;
  guide_id: string | null;
  is_active: boolean;
  created_at: string;
  participants_count: number;
  session_start_at: string | null;
  session_end_at: string | null;
  tour: {
    id: string;
    title: string;
    start_date: string;
    end_date: string | null;
    cover_image: string | null;
    city?: { name: string };
  };
};

interface RawGuideRoomRow {
  id: unknown;
  tour_id: unknown;
  tour_session_id?: unknown;
  guide_id?: unknown;
  is_active: unknown;
  created_at: unknown;
  session?:
    | { start_at?: unknown; end_at?: unknown }
    | { start_at?: unknown; end_at?: unknown }[]
    | null;
  tour?:
    | {
        id: unknown;
        title: unknown;
        start_date: unknown;
        end_date: unknown;
        cover_image?: unknown;
        city?: { name: unknown } | { name: unknown }[] | null;
      }
    | {
        id: unknown;
        title: unknown;
        start_date: unknown;
        end_date: unknown;
        cover_image?: unknown;
        city?: { name: unknown } | { name: unknown }[] | null;
      }[]
    | null;
  participants?: { count?: unknown }[] | null;
}

function participantCountFromEmbed(raw: RawGuideRoomRow['participants']): number {
  if (!Array.isArray(raw) || raw.length === 0) return 0;
  const n = raw[0]?.count;
  if (typeof n === 'number' && !Number.isNaN(n)) return n;
  if (typeof n === 'string') {
    const parsed = parseInt(n, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function mapGuideTourRooms(rawRows: RawGuideRoomRow[] | null | undefined): MappedGuideTourRoom[] {
  return (rawRows ?? []).flatMap((room): MappedGuideTourRoom[] => {
    const tour =
      Array.isArray(room.tour) && room.tour.length > 0
        ? room.tour[0]
        : room.tour && !Array.isArray(room.tour)
          ? room.tour
          : null;

    if (!tour) return [];

    const sessionEmbed = parseEmbeddedSession(room.session);
    const city = tour.city
      ? Array.isArray(tour.city) && tour.city.length > 0
        ? { name: String(tour.city[0].name) }
        : !Array.isArray(tour.city)
          ? { name: String(tour.city.name) }
          : undefined
      : undefined;

    return [
      {
        id: String(room.id),
        tour_id: String(room.tour_id),
        tour_session_id: room.tour_session_id ? String(room.tour_session_id) : null,
        guide_id: room.guide_id ? String(room.guide_id) : null,
        is_active: Boolean(room.is_active),
        created_at: String(room.created_at),
        participants_count: participantCountFromEmbed(room.participants),
        session_start_at: sessionEmbed.start_at,
        session_end_at: sessionEmbed.end_at,
        tour: {
          id: String(tour.id),
          title: String(tour.title),
          start_date: String(tour.start_date),
          end_date: tour.end_date ? String(tour.end_date) : null,
          cover_image: tour.cover_image ? String(tour.cover_image) : null,
          city,
        },
      },
    ];
  });
}

export async function loadGuideTourRooms(
  serviceClient: SupabaseClient,
  options: { guideId?: string; limit?: number } = {}
): Promise<MappedGuideTourRoom[]> {
  let query = serviceClient
    .from('tour_rooms')
    .select(GUIDE_ROOM_SELECT)
    .order('created_at', { ascending: false });

  if (options.guideId) {
    query = query.eq('guide_id', options.guideId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[guide-tour-rooms] load:', error.message);
    return [];
  }

  const mapped = mapGuideTourRooms(data as RawGuideRoomRow[]);
  const enriched = await enrichRoomsWithSessionDates(serviceClient, mapped);
  const backfilled = await assignOrphanRoomsToGuideSessions(serviceClient, enriched);
  return dedupeAwardRooms(backfilled);
}
