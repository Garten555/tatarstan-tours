import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isTourCompletedForReview,
  type BookingForReview,
} from '@/lib/bookings/review-eligibility';
import { publishBookingsChanged } from '@/lib/pusher/data-sync';

function unwrap<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

function normalizeBookingRow(row: Record<string, unknown>): BookingForReview & { id: string; user_id?: string } {
  const tour = unwrap(row.tour as BookingForReview['tour']);
  const tour_session = unwrap(row.tour_session as BookingForReview['tour_session']);
  return {
    id: String(row.id),
    user_id: typeof row.user_id === 'string' ? row.user_id : undefined,
    status: String(row.status ?? ''),
    departure_start_at: (row.departure_start_at as string | null) ?? null,
    departure_end_at: (row.departure_end_at as string | null) ?? null,
    tour_session,
    tour,
  };
}

/** Переводит pending/confirmed → completed, если выезд тура уже прошёл. */
export async function syncPastBookingsToCompleted(
  supabase: SupabaseClient,
  opts?: { tourIds?: string[]; userId?: string }
): Promise<number> {
  let query = supabase
    .from('bookings')
    .select(
      `
      id,
      user_id,
      status,
      departure_start_at,
      departure_end_at,
      tour:tours!bookings_tour_id_fkey(status, start_date, end_date),
      tour_session:tour_sessions!bookings_session_id_fkey(start_at, end_at)
    `
    )
    .in('status', ['pending', 'confirmed']);

  if (opts?.tourIds?.length) {
    query = query.in('tour_id', opts.tourIds);
  }
  if (opts?.userId) {
    query = query.eq('user_id', opts.userId);
  }

  const { data, error } = await query.limit(5000);
  if (error) {
    console.error('[syncPastBookingsToCompleted]', error);
    return 0;
  }

  const toComplete: { id: string; user_id?: string }[] = [];
  for (const row of data ?? []) {
    const booking = normalizeBookingRow(row as Record<string, unknown>);
    if (isTourCompletedForReview(booking)) {
      toComplete.push({ id: booking.id, user_id: booking.user_id });
    }
  }

  if (toComplete.length === 0) return 0;

  const ids = toComplete.map((b) => b.id);
  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .in('id', ids)
    .select('id, user_id');

  if (updateError) {
    console.error('[syncPastBookingsToCompleted] update:', updateError);
    return 0;
  }

  const userIds = new Set(
    (updated ?? [])
      .map((r) => (r as { user_id?: string }).user_id)
      .filter((id): id is string => Boolean(id))
  );
  for (const uid of userIds) {
    void publishBookingsChanged(uid);
  }

  return updated?.length ?? 0;
}
