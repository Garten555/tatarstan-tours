import type { SupabaseClient } from '@supabase/supabase-js';

/** Строка комнаты для списков гида (до дедупликации). */
export type AwardRoomDedupeInput = {
  id: string;
  tour_id: string;
  tour_session_id?: string | null;
  guide_id?: string | null;
  is_active: boolean;
  created_at: string;
  participants_count: number;
  session_start_at?: string | null;
};

function roomDedupeKey(room: AwardRoomDedupeInput): string {
  if (room.tour_session_id) {
    return `session:${room.tour_session_id}`;
  }
  if (room.session_start_at) {
    return `departure:${room.tour_id}:${room.session_start_at}`;
  }
  return `room:${room.id}`;
}

function roomRank(r: AwardRoomDedupeInput) {
  return [
    r.participants_count,
    r.is_active ? 1 : 0,
    new Date(r.created_at).getTime(),
  ] as const;
}

function pickBetterRoom<T extends AwardRoomDedupeInput>(a: T, b: T): T {
  const ra = roomRank(a);
  const rb = roomRank(b);
  if (ra[0] > rb[0]) return a;
  if (ra[0] < rb[0]) return b;
  if (ra[1] > rb[1]) return a;
  if (ra[1] < rb[1]) return b;
  return ra[2] >= rb[2] ? a : b;
}

/**
 * Одна карточка на выезд: по tour_session_id, иначе tour_id + start_at,
 * иначе одна legacy-комната на tour + guide.
 */
export function dedupeAwardRooms<T extends AwardRoomDedupeInput>(rooms: T[]): T[] {
  const bestByKey = new Map<string, T>();

  for (const room of rooms) {
    const key = roomDedupeKey(room);
    const existing = bestByKey.get(key);
    bestByKey.set(key, existing ? pickBetterRoom(room, existing) : room);
  }

  return [...bestByKey.values()].sort((a, b) => {
    const aTs = a.session_start_at
      ? new Date(a.session_start_at).getTime()
      : new Date(a.created_at).getTime();
    const bTs = b.session_start_at
      ? new Date(b.session_start_at).getTime()
      : new Date(b.created_at).getTime();
    return bTs - aTs;
  });
}

export function parseEmbeddedSession(
  raw:
    | { start_at?: unknown; end_at?: unknown }
    | { start_at?: unknown; end_at?: unknown }[]
    | null
    | undefined
): { start_at: string | null; end_at: string | null } {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row) return { start_at: null, end_at: null };
  return {
    start_at: row.start_at ? String(row.start_at) : null,
    end_at: row.end_at ? String(row.end_at) : null,
  };
}

/** Подгружает start_at/end_at, если embed tour_sessions не вернулся. */
export async function enrichRoomsWithSessionDates<
  T extends { tour_session_id?: string | null; session_start_at?: string | null; session_end_at?: string | null },
>(serviceClient: SupabaseClient, rooms: T[]): Promise<T[]> {
  const missingIds = [
    ...new Set(
      rooms
        .filter((r) => r.tour_session_id && !r.session_start_at)
        .map((r) => String(r.tour_session_id))
    ),
  ];

  if (missingIds.length === 0) return rooms;

  const { data, error } = await serviceClient
    .from('tour_sessions')
    .select('id, start_at, end_at')
    .in('id', missingIds);

  if (error) {
    console.error('[guide-tour-rooms] session enrich:', error.message);
    return rooms;
  }

  const byId = new Map(
    (data ?? []).map((row) => [
      String((row as { id: string }).id),
      row as { start_at: string; end_at: string | null },
    ])
  );

  return rooms.map((room) => {
    if (!room.tour_session_id || room.session_start_at) return room;
    const session = byId.get(String(room.tour_session_id));
    if (!session) return room;
    return {
      ...room,
      session_start_at: session.start_at,
      session_end_at: session.end_at,
    };
  });
}

/** Привязка комнат без session_id к слотам гида в tour_sessions (1:1 по порядку). */
export async function assignOrphanRoomsToGuideSessions<
  T extends {
    id: string;
    tour_id: string;
    tour_session_id?: string | null;
    guide_id?: string | null;
    created_at: string;
    session_start_at?: string | null;
    session_end_at?: string | null;
  },
>(serviceClient: SupabaseClient, rooms: T[]): Promise<T[]> {
  const orphans = rooms.filter(
    (r) => !r.tour_session_id && !r.session_start_at && r.guide_id
  );
  if (orphans.length === 0) return rooms;

  const tourIds = [...new Set(orphans.map((r) => r.tour_id))];
  const guideIds = [...new Set(orphans.map((r) => String(r.guide_id)))];

  const { data, error } = await serviceClient
    .from('tour_sessions')
    .select('id, tour_id, guide_id, start_at, end_at')
    .in('tour_id', tourIds)
    .in('guide_id', guideIds)
    .eq('status', 'active')
    .order('start_at', { ascending: true });

  if (error) {
    console.error('[guide-tour-rooms] orphan session assign:', error.message);
    return rooms;
  }

  type SessionRow = { id: string; tour_id: string; guide_id: string; start_at: string; end_at: string | null };
  const sessionsByTourGuide = new Map<string, SessionRow[]>();
  for (const row of (data ?? []) as SessionRow[]) {
    const bucketKey = `${row.tour_id}:${row.guide_id}`;
    const bucket = sessionsByTourGuide.get(bucketKey) ?? [];
    bucket.push(row);
    sessionsByTourGuide.set(bucketKey, bucket);
  }

  const sessionByRoomId = new Map<string, SessionRow>();

  for (const orphan of orphans) {
    const bucketKey = `${orphan.tour_id}:${orphan.guide_id}`;
    const sessions = sessionsByTourGuide.get(bucketKey) ?? [];
    if (sessions.length === 0) continue;

    const sortedOrphans = orphans
      .filter((r) => `${r.tour_id}:${r.guide_id}` === bucketKey)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const orphanIndex = sortedOrphans.findIndex((r) => r.id === orphan.id);
    if (orphanIndex < 0) continue;

    const session = sessions[Math.min(orphanIndex, sessions.length - 1)];
    sessionByRoomId.set(orphan.id, session);
  }

  return rooms.map((room) => {
    const session = sessionByRoomId.get(room.id);
    if (!session) return room;
    return {
      ...room,
      tour_session_id: session.id,
      session_start_at: session.start_at,
      session_end_at: session.end_at,
    };
  });
}

export type RoomDepartureLike = {
  session_start_at?: string | null;
  session_end_at?: string | null;
  tour: { start_date: string; end_date?: string | null };
};

export function roomDepartureStart(room: RoomDepartureLike): string {
  return room.session_start_at ?? room.tour.start_date;
}

export function roomDepartureEnd(room: RoomDepartureLike): string | null {
  return room.session_end_at ?? room.tour.end_date ?? null;
}

export type RoomTourLifecycle = 'ongoing' | 'upcoming' | 'ended';

export function roomTourLifecycle(room: RoomDepartureLike): RoomTourLifecycle {
  const now = new Date();
  const endRaw = roomDepartureEnd(room);
  const ended = endRaw ? new Date(endRaw) < now : false;
  const started = new Date(roomDepartureStart(room)) <= now;
  if (ended) return 'ended';
  if (!started) return 'upcoming';
  return 'ongoing';
}
