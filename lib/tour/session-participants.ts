import type { SupabaseClient } from '@supabase/supabase-js';

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'] as const;

/** Сумма мест по активным броням на слот. */
export async function sumActiveBookingSeatsForSession(
  serviceClient: SupabaseClient,
  sessionId: string
): Promise<number> {
  const { data, error } = await serviceClient
    .from('bookings')
    .select('num_people')
    .eq('session_id', sessionId)
    .in('status', [...ACTIVE_BOOKING_STATUSES]);

  if (error) {
    console.error('sumActiveBookingSeatsForSession:', error);
    return 0;
  }

  return (data ?? []).reduce(
    (sum, row) => sum + Math.max(0, Number(row.num_people) || 0),
    0
  );
}

/** Синхронизирует tour_sessions.current_participants с реальными бронями. */
export async function syncSessionCurrentParticipants(
  serviceClient: SupabaseClient,
  sessionId: string
): Promise<number> {
  const total = await sumActiveBookingSeatsForSession(serviceClient, sessionId);
  const { error } = await serviceClient
    .from('tour_sessions')
    .update({ current_participants: total })
    .eq('id', sessionId);

  if (error) {
    console.error('syncSessionCurrentParticipants:', error);
  }
  return total;
}

/**
 * Новый выезд после прошлой даты: старые pending/confirmed не должны занимать места.
 */
export function isNewDepartureAfterPastSchedule(
  oldStartAt: string,
  newStartAt: string,
  nowMs: number = Date.now()
): boolean {
  const oldMs = new Date(oldStartAt).getTime();
  const newMs = new Date(newStartAt).getTime();
  if (!Number.isFinite(oldMs) || !Number.isFinite(newMs)) return false;
  return oldMs <= nowMs && newMs > nowMs;
}

/** Закрывает старые брони на слот и обнуляет счётчик (перезапуск выезда). */
export async function clearSessionCapacityForNewDeparture(
  serviceClient: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { data: bookings, error: listErr } = await serviceClient
    .from('bookings')
    .select('id')
    .eq('session_id', sessionId)
    .in('status', [...ACTIVE_BOOKING_STATUSES]);

  if (listErr) {
    console.error('clearSessionCapacityForNewDeparture list:', listErr);
    return;
  }

  const ids = (bookings ?? []).map((b) => b.id);
  if (ids.length > 0) {
    const { error: cancelErr } = await serviceClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('id', ids);

    if (cancelErr) {
      console.error('clearSessionCapacityForNewDeparture cancel:', cancelErr);
    }
  }

  const { error: resetErr } = await serviceClient
    .from('tour_sessions')
    .update({ current_participants: 0 })
    .eq('id', sessionId);

  if (resetErr) {
    console.error('clearSessionCapacityForNewDeparture reset:', resetErr);
  }
}

/** Пересчитать все слоты тура (после смены дат в tours). */
export async function syncAllTourSessionParticipants(
  serviceClient: SupabaseClient,
  tourId: string
): Promise<void> {
  const { data: sessions, error } = await serviceClient
    .from('tour_sessions')
    .select('id')
    .eq('tour_id', tourId);

  if (error || !sessions?.length) return;

  await Promise.all(
    sessions.map((s) =>
      syncSessionCurrentParticipants(serviceClient, s.id as string)
    )
  );
}
