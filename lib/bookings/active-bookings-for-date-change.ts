import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isTourInstanceTimeEnded,
  isTourSessionStillBookable,
} from '@/lib/tour/session-bookable';

/**
 * Брони, из‑за которых нужно предупреждение при смене дат в админке:
 * pending/confirmed на ещё не прошедших выездах (не «зависшие» confirmed после тура).
 */
export async function countBookingsAffectedByDateChange(
  serviceClient: SupabaseClient,
  tourId: string,
  nowMs: number = Date.now()
): Promise<number> {
  const { data: tour, error: tourError } = await serviceClient
    .from('tours')
    .select('status, start_date, end_date')
    .eq('id', tourId)
    .single();

  if (tourError || !tour) return 0;

  if (tour.status === 'completed' || tour.status === 'cancelled') {
    return 0;
  }

  const { data: bookings, error: bookingsError } = await serviceClient
    .from('bookings')
    .select('id, session_id')
    .eq('tour_id', tourId)
    .in('status', ['pending', 'confirmed']);

  if (bookingsError || !bookings?.length) return 0;

  const sessionIds = [
    ...new Set(
      bookings
        .map((b) => b.session_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const sessionsById = new Map<
    string,
    { start_at: string; end_at: string | null }
  >();

  if (sessionIds.length > 0) {
    const { data: sessions } = await serviceClient
      .from('tour_sessions')
      .select('id, start_at, end_at')
      .in('id', sessionIds);

    for (const row of sessions || []) {
      sessionsById.set(row.id, {
        start_at: row.start_at,
        end_at: row.end_at,
      });
    }
  }

  let count = 0;
  for (const booking of bookings) {
    if (booking.session_id) {
      const session = sessionsById.get(booking.session_id);
      if (
        session &&
        isTourSessionStillBookable(session.start_at, session.end_at, nowMs)
      ) {
        count += 1;
      }
      continue;
    }

    if (
      !isTourInstanceTimeEnded(
        {
          tourStart: tour.start_date,
          tourEnd: tour.end_date,
        },
        nowMs
      )
    ) {
      count += 1;
    }
  }

  return count;
}
