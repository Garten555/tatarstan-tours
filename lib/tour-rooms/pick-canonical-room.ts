import type { SupabaseClient } from '@supabase/supabase-js';

/** Комната с наибольшим числом участников — каноническая для выдачи достижений. */
export async function pickCanonicalRoomId(
  serviceClient: SupabaseClient,
  roomIds: string[]
): Promise<string | null> {
  if (roomIds.length === 0) return null;
  if (roomIds.length === 1) return roomIds[0];

  const { data, error } = await serviceClient
    .from('tour_room_participants')
    .select('room_id')
    .in('room_id', roomIds);

  if (error) {
    console.error('[canonical-room] count:', error.message);
    return roomIds[0];
  }

  const counts = new Map<string, number>();
  for (const id of roomIds) counts.set(id, 0);
  for (const row of data ?? []) {
    const rid = String((row as { room_id: string }).room_id);
    counts.set(rid, (counts.get(rid) ?? 0) + 1);
  }

  let bestId = roomIds[0];
  let bestCount = -1;
  for (const id of roomIds) {
    const n = counts.get(id) ?? 0;
    if (n > bestCount) {
      bestCount = n;
      bestId = id;
    }
  }
  return bestId;
}
