import type { SupabaseClient } from '@supabase/supabase-js';

/** Строка комнаты для страницы выдачи достижений (до дедупликации). */
export type AwardRoomDedupeInput = {
  id: string;
  tour_id: string;
  tour_session_id?: string | null;
  is_active: boolean;
  created_at: string;
  participants_count: number;
  session_start_at?: string | null;
};

/**
 * Схлопывает только настоящие дубли одного выезда (один tour_session_id).
 * Разные комнаты/выезды одного тура без session_id не объединяются.
 */
export function dedupeAwardRooms<T extends AwardRoomDedupeInput>(rooms: T[]): T[] {
  const bestBySession = new Map<string, T>();
  const passthrough: T[] = [];

  for (const room of rooms) {
    if (!room.tour_session_id) {
      passthrough.push(room);
      continue;
    }

    const key = room.tour_session_id;
    const existing = bestBySession.get(key);
    if (!existing) {
      bestBySession.set(key, room);
      continue;
    }

    const rank = (r: T) =>
      [r.participants_count, r.is_active ? 1 : 0, new Date(r.created_at).getTime()] as const;

    const a = rank(room);
    const b = rank(existing);
    if (
      a[0] > b[0] ||
      (a[0] === b[0] && a[1] > b[1]) ||
      (a[0] === b[0] && a[1] === b[1] && a[2] > b[2])
    ) {
      bestBySession.set(key, room);
    }
  }

  return [...passthrough, ...bestBySession.values()].sort((a, b) => {
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
