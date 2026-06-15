import type { SupabaseClient } from '@supabase/supabase-js';

export const GUIDE_OWN_TOUR_ERROR =
  'Гид не может забронировать тур, на котором он назначен ведущим';

/** Слоты тура, где пользователь назначен гидом (tour_sessions + tour_rooms). */
export async function getUserGuidedSessionIdsForTour(
  serviceClient: SupabaseClient,
  userId: string,
  tourId: string
): Promise<string[]> {
  const ids = new Set<string>();

  const [sessionsRes, roomsRes] = await Promise.all([
    serviceClient
      .from('tour_sessions')
      .select('id')
      .eq('tour_id', tourId)
      .eq('guide_id', userId),
    serviceClient
      .from('tour_rooms')
      .select('tour_session_id')
      .eq('tour_id', tourId)
      .eq('guide_id', userId),
  ]);

  if (sessionsRes.error) {
    console.error('[guide-own-tour] sessions:', sessionsRes.error.message);
  }
  if (roomsRes.error) {
    console.error('[guide-own-tour] rooms:', roomsRes.error.message);
  }

  for (const row of sessionsRes.data ?? []) {
    if (row.id) ids.add(String(row.id));
  }
  for (const row of roomsRes.data ?? []) {
    const sessionId = (row as { tour_session_id?: string | null }).tour_session_id;
    if (sessionId) ids.add(String(sessionId));
  }

  return [...ids];
}

/** Блокирует бронь, если пользователь — назначенный гид этого выезда/тура. */
export async function isUserAssignedGuideForBooking(
  serviceClient: SupabaseClient,
  userId: string,
  tourId: string,
  sessionId: string | null
): Promise<boolean> {
  if (sessionId) {
    const guidedSessionIds = await getUserGuidedSessionIdsForTour(
      serviceClient,
      userId,
      tourId
    );
    return guidedSessionIds.includes(sessionId);
  }

  const guidedSessionIds = await getUserGuidedSessionIdsForTour(
    serviceClient,
    userId,
    tourId
  );
  if (guidedSessionIds.length > 0) return true;

  const { count: legacyRoomCount, error: roomErr } = await serviceClient
    .from('tour_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('tour_id', tourId)
    .eq('guide_id', userId)
    .is('tour_session_id', null);

  if (roomErr) {
    console.error('[guide-own-tour] legacy rooms:', roomErr.message);
    return false;
  }

  return (legacyRoomCount ?? 0) > 0;
}
