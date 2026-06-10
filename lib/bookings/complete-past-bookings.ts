import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isTourCompletedForReview,
  type BookingForReview,
} from '@/lib/bookings/review-eligibility';
import { publishBookingsChanged } from '@/lib/pusher/data-sync';

const ACTIVE_STATUSES = ['pending', 'confirmed'] as const;
const PAGE_SIZE = 500;

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
    schedule_superseded_at: (row.schedule_superseded_at as string | null) ?? null,
    tour_session,
    tour,
  };
}

const BOOKING_SELECT = `
  id,
  user_id,
  status,
  departure_start_at,
  departure_end_at,
  schedule_superseded_at,
  tour:tours!bookings_tour_id_fkey(status, start_date, end_date),
  tour_session:tour_sessions!bookings_session_id_fkey(start_at, end_at)
`;

async function collectPastBookingIds(
  supabase: SupabaseClient,
  opts?: { tourIds?: string[]; userId?: string }
): Promise<Map<string, string | undefined>> {
  const ids = new Map<string, string | undefined>();
  const nowIso = new Date().toISOString();

  const addRow = (row: { id: string; user_id?: string }) => {
    ids.set(String(row.id), typeof row.user_id === 'string' ? row.user_id : undefined);
  };

  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .in('status', [...ACTIVE_STATUSES]);
    if (opts?.tourIds?.length) {
      query = query.in('tour_id', opts.tourIds);
    }
    if (opts?.userId) {
      query = query.eq('user_id', opts.userId);
    }
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error('[syncPastBookingsToCompleted] page:', error);
      break;
    }
    const rows = data ?? [];
    for (const row of rows) {
      const booking = normalizeBookingRow(row as Record<string, unknown>);
      if (isTourCompletedForReview(booking)) {
        addRow({ id: booking.id, user_id: booking.user_id });
      }
    }
    if (rows.length < PAGE_SIZE) break;
  }

  let pastDepartureQuery = supabase
    .from('bookings')
    .select('id, user_id')
    .in('status', [...ACTIVE_STATUSES])
    .lt('departure_start_at', nowIso);
  if (opts?.tourIds?.length) {
    pastDepartureQuery = pastDepartureQuery.in('tour_id', opts.tourIds);
  }
  if (opts?.userId) {
    pastDepartureQuery = pastDepartureQuery.eq('user_id', opts.userId);
  }
  const { data: pastByDeparture, error: pastDepErr } = await pastDepartureQuery;
  if (pastDepErr) {
    console.error('[syncPastBookingsToCompleted] past departure:', pastDepErr);
  } else {
    for (const row of pastByDeparture ?? []) {
      addRow(row as { id: string; user_id?: string });
    }
  }

  let supersededQuery = supabase
    .from('bookings')
    .select(
      `
      id,
      user_id,
      status,
      departure_start_at,
      departure_end_at,
      schedule_superseded_at,
      tour:tours!bookings_tour_id_fkey(status, start_date, end_date),
      tour_session:tour_sessions!bookings_session_id_fkey(start_at, end_at)
    `
    )
    .in('status', [...ACTIVE_STATUSES])
    .not('schedule_superseded_at', 'is', null)
    .lt('departure_start_at', nowIso);
  if (opts?.tourIds?.length) {
    supersededQuery = supersededQuery.in('tour_id', opts.tourIds);
  }
  if (opts?.userId) {
    supersededQuery = supersededQuery.eq('user_id', opts.userId);
  }
  const { data: supersededRows, error: supersededErr } = await supersededQuery;
  if (supersededErr) {
    console.error('[syncPastBookingsToCompleted] superseded:', supersededErr);
  } else {
    for (const row of supersededRows ?? []) {
      const booking = normalizeBookingRow(row as Record<string, unknown>);
      if (isTourCompletedForReview(booking)) {
        addRow({ id: booking.id, user_id: booking.user_id });
      }
    }
  }

  return ids;
}

/** Переводит pending/confirmed → completed, если выезд тура уже прошёл. */
export async function syncPastBookingsToCompleted(
  supabase: SupabaseClient,
  opts?: { tourIds?: string[]; userId?: string }
): Promise<number> {
  const toComplete = await collectPastBookingIds(supabase, opts);
  if (toComplete.size === 0) return 0;

  const idList = [...toComplete.keys()];
  let updatedCount = 0;
  const userIds = new Set<string>();

  for (let i = 0; i < idList.length; i += 100) {
    const chunk = idList.slice(i, i + 100);
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .in('id', chunk)
      .in('status', [...ACTIVE_STATUSES])
      .select('id, user_id');

    if (updateError) {
      console.error('[syncPastBookingsToCompleted] update:', updateError);
      continue;
    }

    updatedCount += updated?.length ?? 0;
    for (const row of updated ?? []) {
      const uid = (row as { user_id?: string }).user_id;
      if (uid) userIds.add(uid);
    }
  }

  for (const uid of userIds) {
    void publishBookingsChanged(uid);
  }

  return updatedCount;
}
