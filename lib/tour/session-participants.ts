import type { SupabaseClient } from '@supabase/supabase-js';

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'] as const;

function isoNorm(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
}

type BookingSeatRow = {
  num_people: number | null;
  departure_start_at?: string | null;
};

/** Бронь занимает место в текущем расписании слота. */
export function bookingCountsTowardSessionCapacity(
  booking: BookingSeatRow,
  sessionStartAt: string
): boolean {
  if (!booking.departure_start_at) return true;
  return isoNorm(booking.departure_start_at) === isoNorm(sessionStartAt);
}

/** Сумма мест по активным броням на актуальный выезд слота. */
export async function sumActiveBookingSeatsForSession(
  serviceClient: SupabaseClient,
  sessionId: string
): Promise<number> {
  const { data: session, error: sessionErr } = await serviceClient
    .from('tour_sessions')
    .select('start_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionErr || !session?.start_at) {
    if (sessionErr) console.error('sumActiveBookingSeatsForSession session:', sessionErr);
    return 0;
  }

  const { data, error } = await serviceClient
    .from('bookings')
    .select('num_people, departure_start_at')
    .eq('session_id', sessionId)
    .in('status', [...ACTIVE_BOOKING_STATUSES]);

  if (error) {
    console.error('sumActiveBookingSeatsForSession:', error);
    return 0;
  }

  return (data ?? [])
    .filter((row) =>
      bookingCountsTowardSessionCapacity(
        row as BookingSeatRow,
        session.start_at as string
      )
    )
    .reduce((sum, row) => sum + Math.max(0, Number(row.num_people) || 0), 0);
}

/** Синхронизирует tour_sessions.current_participants с бронями на текущие даты слота. */
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
