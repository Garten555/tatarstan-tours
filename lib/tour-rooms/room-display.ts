import type { SupabaseClient } from '@supabase/supabase-js';
import { parseEmbeddedSession } from '@/lib/achievements/dedupe-award-rooms';
import { fetchMergedRoomParticipants } from '@/lib/tour-rooms/merged-room-participants';

export type TourRoomDisplayFields = {
  session_start_at: string | null;
  session_end_at: string | null;
  participants_count: number;
};

/** Даты выезда и число участников по конкретному экземпляру (session + merge duplicate rooms). */
export async function loadTourRoomDisplayFields(
  serviceClient: SupabaseClient,
  roomId: string,
  sessionRaw?: unknown
): Promise<TourRoomDisplayFields> {
  const sessionPromise =
    sessionRaw !== undefined
      ? Promise.resolve(
          parseEmbeddedSession(
            sessionRaw as Parameters<typeof parseEmbeddedSession>[0]
          )
        )
      : serviceClient
          .from('tour_rooms')
          .select('session:tour_sessions!tour_rooms_tour_session_id_fkey(start_at, end_at)')
          .eq('id', roomId)
          .maybeSingle()
          .then(({ data }) =>
            parseEmbeddedSession(
              (data as { session?: Parameters<typeof parseEmbeddedSession>[0] } | null)
                ?.session
            )
          );

  const [{ participants }, session] = await Promise.all([
    fetchMergedRoomParticipants(serviceClient, roomId),
    sessionPromise,
  ]);

  return {
    session_start_at: session.start_at,
    session_end_at: session.end_at,
    participants_count: participants.length,
  };
}
