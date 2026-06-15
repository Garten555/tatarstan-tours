import type { SupabaseClient } from '@supabase/supabase-js';

export type PrunePastSessionsResult = {
  toursChecked: number;
  sessionsRemoved: number;
  tourIds: string[];
};

/**
 * Удаляет прошедшие слоты без бронирований — освобождает «хвосты» старых экземпляров.
 */
export async function prunePastTourSessionsWithoutBookings(
  serviceClient: SupabaseClient,
  options?: { tourIds?: string[] }
): Promise<PrunePastSessionsResult> {
  const nowIso = new Date().toISOString();
  let query = serviceClient
    .from('tour_sessions')
    .select('id, tour_id, start_at')
    .lt('start_at', nowIso)
    .neq('status', 'cancelled');

  if (options?.tourIds?.length) {
    query = query.in('tour_id', options.tourIds);
  }

  const { data: pastRows, error } = await query.limit(5000);
  if (error) {
    console.error('prunePastTourSessionsWithoutBookings', error);
    return { toursChecked: 0, sessionsRemoved: 0, tourIds: [] };
  }

  const toDelete: string[] = [];
  const touchedTours = new Set<string>();

  for (const row of pastRows ?? []) {
    const sessionId = (row as { id: string }).id;
    const tourId = (row as { tour_id: string }).tour_id;

    const { count, error: cntErr } = await serviceClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (cntErr) continue;
    if ((count ?? 0) > 0) continue;

    toDelete.push(sessionId);
    touchedTours.add(tourId);
  }

  if (toDelete.length > 0) {
    const { error: delErr } = await serviceClient
      .from('tour_sessions')
      .delete()
      .in('id', toDelete);
    if (delErr) {
      console.error('prunePastTourSessionsWithoutBookings delete', delErr);
      return { toursChecked: touchedTours.size, sessionsRemoved: 0, tourIds: [] };
    }
  }

  return {
    toursChecked: touchedTours.size,
    sessionsRemoved: toDelete.length,
    tourIds: [...touchedTours],
  };
}
