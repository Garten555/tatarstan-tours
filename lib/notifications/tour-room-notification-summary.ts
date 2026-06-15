import type { SupabaseClient } from '@supabase/supabase-js';

const ROOM_ID_MARKER = '\nroom_id:';

export type TourRoomNotificationSummary = {
  total: number;
  tour_room_message: number;
  room_counts: Record<string, number>;
};

/** Сводка непрочитанных уведомлений (комнаты тура — через таблицу notifications). */
export async function getTourRoomNotificationSummary(
  serviceClient: SupabaseClient,
  userId: string
): Promise<TourRoomNotificationSummary> {
  const [{ count: total }, { data: roomNotifications, error }] = await Promise.all([
    serviceClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    serviceClient
      .from('notifications')
      .select('body')
      .eq('user_id', userId)
      .eq('type', 'tour_room_message')
      .limit(500),
  ]);

  if (error) {
    console.error('[notifications/summary]', error.message);
  }

  const roomCounts: Record<string, number> = {};
  let tourRoomCount = 0;

  for (const n of roomNotifications ?? []) {
    tourRoomCount += 1;
    const body = (n as { body?: string | null }).body || '';
    const idx = body.indexOf(ROOM_ID_MARKER);
    if (idx === -1) continue;
    const roomId = body.slice(idx + ROOM_ID_MARKER.length).trim();
    if (roomId) {
      roomCounts[roomId] = (roomCounts[roomId] || 0) + 1;
    }
  }

  return {
    total: total ?? 0,
    tour_room_message: tourRoomCount,
    room_counts: roomCounts,
  };
}

/** Переносит счётчики с id из уведомления на id комнаты в списке (один выезд — несколько room_id). */
export async function mapUnreadCountsToDisplayedRooms(
  serviceClient: SupabaseClient,
  displayedRooms: { id: string; tour_session_id: string | null }[],
  rawCounts: Record<string, number>
): Promise<Record<string, number>> {
  const displayedIds = new Set(displayedRooms.map((r) => r.id));
  const bySession = new Map<string, string>();
  for (const room of displayedRooms) {
    if (room.tour_session_id) {
      bySession.set(room.tour_session_id, room.id);
    }
  }

  const notifRoomIds = Object.keys(rawCounts);
  if (notifRoomIds.length === 0) return {};

  const { data: notifRooms } = await serviceClient
    .from('tour_rooms')
    .select('id, tour_session_id')
    .in('id', notifRoomIds);

  const sessionByNotifRoom = new Map<string, string | null>(
    (notifRooms ?? []).map((r) => [
      String((r as { id: string }).id),
      (r as { tour_session_id?: string | null }).tour_session_id ?? null,
    ])
  );

  const result: Record<string, number> = {};
  for (const [notifRoomId, count] of Object.entries(rawCounts)) {
    let targetId = notifRoomId;
    if (!displayedIds.has(targetId)) {
      const sessionId = sessionByNotifRoom.get(notifRoomId);
      if (sessionId) {
        targetId = bySession.get(sessionId) ?? targetId;
      }
    }
    if (displayedIds.has(targetId)) {
      result[targetId] = (result[targetId] || 0) + count;
    }
  }

  return result;
}
