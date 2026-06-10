import type { SupabaseClient } from '@supabase/supabase-js';

import { LEGACY_TOUR_SESSION_ID } from '@/lib/tour/legacy-session';
import { syncPastBookingsToCompleted } from '@/lib/bookings/complete-past-bookings';
import { publishCatalogChanged } from '@/lib/pusher/data-sync';
import {
  hasScheduledFutureStart,
  isTourEndedByEndDate,
  isUpcomingSession,
} from '@/lib/tours/tour-public-visibility';

type SessionRow = { id: string; start_at: string };

export type TourForLifecycle = {
  id: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
};

/** Активный тур пора перевести в completed: нет будущих выездов и период тура закончился. */
export function shouldAutoCompleteTour(
  tour: Pick<TourForLifecycle, 'status' | 'start_date' | 'end_date'>,
  sessions: SessionRow[],
  now: Date = new Date()
): boolean {
  if (tour.status !== 'active') return false;
  if (hasScheduledFutureStart(tour, now)) return false;

  const realSessions = sessions.filter((s) => s.id !== LEGACY_TOUR_SESSION_ID);
  if (realSessions.some((s) => isUpcomingSession(s.start_at, now))) return false;

  if (isTourEndedByEndDate(tour, now)) return true;

  if (realSessions.length > 0) {
    return realSessions.every((s) => !isUpcomingSession(s.start_at, now));
  }

  if (tour.start_date && new Date(tour.start_date) <= now) {
    if (!tour.end_date) return false;
    return new Date(tour.end_date) < now;
  }

  return false;
}

export function getEffectiveTourStatus(
  tour: Pick<TourForLifecycle, 'status' | 'start_date' | 'end_date'>,
  sessions: SessionRow[],
  now: Date = new Date()
): string {
  if (shouldAutoCompleteTour(tour, sessions, now)) return 'completed';
  return tour.status;
}

function groupSessionsByTourId(
  rows: { id: string; tour_id: string; start_at: string }[]
): Map<string, SessionRow[]> {
  const map = new Map<string, SessionRow[]>();
  for (const row of rows) {
    const list = map.get(row.tour_id) ?? [];
    list.push({ id: row.id, start_at: row.start_at });
    map.set(row.tour_id, list);
  }
  return map;
}

export async function fetchActiveSessionsByTourId(
  supabase: SupabaseClient,
  tourIds: string[]
): Promise<Map<string, SessionRow[]>> {
  if (tourIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('tour_sessions')
    .select('id, tour_id, start_at')
    .eq('status', 'active')
    .in('tour_id', tourIds);

  if (error) {
    console.error('fetchActiveSessionsByTourId:', error);
    return new Map();
  }

  return groupSessionsByTourId(data ?? []);
}

export function attachEffectiveTourStatus<T extends TourForLifecycle>(
  tours: T[],
  sessionsByTourId: Map<string, SessionRow[]>,
  now: Date = new Date()
): (T & { effective_status: string })[] {
  return tours.map((tour) => ({
    ...tour,
    effective_status: getEffectiveTourStatus(
      tour,
      sessionsByTourId.get(tour.id) ?? [],
      now
    ),
  }));
}

/** Переводит active → completed для туров без будущих выездов. */
export async function completeFinishedActiveTours(
  supabase: SupabaseClient
): Promise<{ completed_count: number; tour_ids: string[] }> {
  const now = new Date();

  const { data: activeTours, error } = await supabase
    .from('tours')
    .select('id, status, start_date, end_date')
    .eq('status', 'active')
    .limit(8000);

  if (error) {
    console.error('completeFinishedActiveTours:', error);
    return { completed_count: 0, tour_ids: [] };
  }

  if (!activeTours?.length) {
    return { completed_count: 0, tour_ids: [] };
  }

  const sessionsByTourId = await fetchActiveSessionsByTourId(
    supabase,
    activeTours.map((t) => t.id)
  );

  const idsToComplete = activeTours
    .filter((tour) =>
      shouldAutoCompleteTour(tour, sessionsByTourId.get(tour.id) ?? [], now)
    )
    .map((t) => t.id);

  if (idsToComplete.length === 0) {
    return { completed_count: 0, tour_ids: [] };
  }

  const { data: updated, error: updateError } = await supabase
    .from('tours')
    .update({ status: 'completed' })
    .in('id', idsToComplete)
    .select('id');

  if (updateError) {
    console.error('completeFinishedActiveTours update:', updateError);
    return { completed_count: 0, tour_ids: [] };
  }

  const completed_count = updated?.length ?? 0;
  if (completed_count > 0) {
    void publishCatalogChanged();
    await syncPastBookingsToCompleted(supabase, { tourIds: idsToComplete });
  }

  return {
    completed_count,
    tour_ids: (updated ?? []).map((t) => t.id),
  };
}
