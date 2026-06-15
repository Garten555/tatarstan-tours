import type { SupabaseClient } from '@supabase/supabase-js';

export const GUIDE_OWN_TOUR_ERROR =
  'Гид не может забронировать тур, на котором он назначен ведущим';

/** Блокирует бронь, если пользователь — назначенный гид этого выезда/тура. */
export async function isUserAssignedGuideForBooking(
  serviceClient: SupabaseClient,
  userId: string,
  tourId: string,
  sessionId: string | null
): Promise<boolean> {
  if (sessionId) {
    const { data, error } = await serviceClient
      .from('tour_sessions')
      .select('guide_id')
      .eq('id', sessionId)
      .eq('tour_id', tourId)
      .maybeSingle();

    if (error) {
      console.error('[guide-own-tour] session lookup:', error.message);
      return false;
    }

    return (data as { guide_id?: string | null } | null)?.guide_id === userId;
  }

  const { count: sessionGuideCount, error: sessionErr } = await serviceClient
    .from('tour_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('tour_id', tourId)
    .eq('guide_id', userId);

  if (sessionErr) {
    console.error('[guide-own-tour] sessions count:', sessionErr.message);
    return false;
  }

  if ((sessionGuideCount ?? 0) > 0) return true;

  const { count: roomGuideCount, error: roomErr } = await serviceClient
    .from('tour_rooms')
    .select('id', { count: 'exact', head: true })
    .eq('tour_id', tourId)
    .eq('guide_id', userId);

  if (roomErr) {
    console.error('[guide-own-tour] rooms count:', roomErr.message);
    return false;
  }

  return (roomGuideCount ?? 0) > 0;
}
