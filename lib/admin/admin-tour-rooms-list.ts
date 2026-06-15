import type { SupabaseClient } from '@supabase/supabase-js';
import { parseEmbeddedSession } from '@/lib/achievements/dedupe-award-rooms';
import {
  filterGuideTourRooms,
  type GuideTourLifecycleFilter,
} from '@/lib/admin/guide-tour-rooms-filters';
import { sanitizeText } from '@/lib/utils/sanitize';

const ROOM_SELECT = `
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
`;

const MAX_SCAN = 2000;

export type AdminTourRoomsListOptions = {
  page?: number;
  limit?: number;
  search?: string;
  lifecycle?: GuideTourLifecycleFilter | 'all';
  month?: string;
  date?: string;
  guide?: 'all' | 'assigned' | 'none';
  participants?: 'all' | 'with' | 'empty';
};

type FilterableRoom = {
  id: string;
  tour_id: string;
  tour_session_id: string | null;
  guide_id: string | null;
  is_active: boolean;
  created_at: string;
  session_start_at: string | null;
  session_end_at: string | null;
  participants_count: number;
  tour: {
    id: string;
    slug?: string | null;
    title: string;
    start_date: string;
    end_date: string | null;
    cover_image?: string | null;
    city?: { name: string };
  };
  session?: { start_at: string; end_at: string | null } | null;
  guide?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

function mapRoomRow(room: Record<string, unknown>): FilterableRoom | null {
  const rawTour = room.tour;
  const tour = Array.isArray(rawTour) ? rawTour[0] : rawTour;
  if (!tour || typeof tour !== 'object') return null;

  const rawSession = room.session;
  const sessionEmbed = parseEmbeddedSession(
    rawSession as Parameters<typeof parseEmbeddedSession>[0]
  );
  const session = Array.isArray(rawSession) ? rawSession[0] : rawSession;

  const rawGuide = room.guide;
  const guide = Array.isArray(rawGuide) ? rawGuide[0] : rawGuide;

  const rawParticipants = room.participants as { count?: unknown }[] | null | undefined;
  let participants_count = 0;
  if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
    const n = rawParticipants[0]?.count;
    participants_count =
      typeof n === 'number' ? n : typeof n === 'string' ? parseInt(n, 10) || 0 : 0;
  }

  const cityRaw = (tour as { city?: unknown }).city;
  const city =
    Array.isArray(cityRaw) && cityRaw[0]
      ? { name: String((cityRaw[0] as { name: unknown }).name) }
      : cityRaw && !Array.isArray(cityRaw)
        ? { name: String((cityRaw as { name: unknown }).name) }
        : undefined;

  return {
    id: String(room.id),
    tour_id: String(room.tour_id),
    tour_session_id: room.tour_session_id ? String(room.tour_session_id) : null,
    guide_id: room.guide_id ? String(room.guide_id) : null,
    is_active: Boolean(room.is_active),
    created_at: String(room.created_at),
    session_start_at: sessionEmbed.start_at,
    session_end_at: sessionEmbed.end_at,
    participants_count,
    tour: {
      id: String((tour as { id: unknown }).id),
      slug: (tour as { slug?: string | null }).slug ?? null,
      title: String((tour as { title: unknown }).title),
      start_date: String((tour as { start_date: unknown }).start_date),
      end_date: (tour as { end_date?: string | null }).end_date ?? null,
      cover_image: (tour as { cover_image?: string | null }).cover_image ?? null,
      city,
    },
    session:
      session && typeof session === 'object'
        ? {
            start_at: String((session as { start_at: unknown }).start_at),
            end_at: (session as { end_at?: string | null }).end_at ?? null,
          }
        : null,
    guide:
      guide && typeof guide === 'object'
        ? {
            id: String((guide as { id: unknown }).id),
            first_name: String((guide as { first_name: unknown }).first_name),
            last_name: String((guide as { last_name: unknown }).last_name),
            email: String((guide as { email: unknown }).email),
          }
        : null,
  };
}

export async function listAdminTourRooms(
  serviceClient: SupabaseClient,
  rawOpts: AdminTourRoomsListOptions
) {
  const page = Math.max(1, rawOpts.page ?? 1);
  const limit = Math.min(Math.max(1, rawOpts.limit ?? 10), 50);
  const search = sanitizeText(rawOpts.search ?? '').trim();
  const lifecycle = (rawOpts.lifecycle ?? 'all') as GuideTourLifecycleFilter | 'all';
  const month = sanitizeText(rawOpts.month ?? '').trim();
  const date = sanitizeText(rawOpts.date ?? '').trim();
  const guide = rawOpts.guide ?? 'all';
  const participants = rawOpts.participants ?? 'all';

  const { data: rooms, error } = await serviceClient
    .from('tour_rooms')
    .select(ROOM_SELECT)
    .order('created_at', { ascending: false })
    .limit(MAX_SCAN);

  if (error) throw error;

  const mapped = ((rooms ?? []) as Record<string, unknown>[])
    .map(mapRoomRow)
    .filter((r): r is FilterableRoom => r !== null);

  const catalogTotal = mapped.length;

  const filtered = filterGuideTourRooms(mapped, {
    search,
    lifecycle: lifecycle === 'all' ? 'all' : lifecycle,
    monthFilter: date ? '' : month,
    dateFilter: date,
    searchExtra: (room, q) => {
      const g = room.guide;
      if (!g) return false;
      const hay = `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase();
      return hay.includes(q);
    },
  }).filter((room) => {
    const count = room.participants_count ?? 0;
    if (guide === 'assigned' && !room.guide_id) return false;
    if (guide === 'none' && room.guide_id) return false;
    if (participants === 'with' && count === 0) return false;
    if (participants === 'empty' && count > 0) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    rooms: filtered.slice(start, start + limit),
    total,
    catalogTotal,
    page,
    limit,
    totalPages,
  };
}
