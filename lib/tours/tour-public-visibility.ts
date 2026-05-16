import type { SupabaseClient } from '@supabase/supabase-js';

import { LEGACY_TOUR_SESSION_ID } from '@/lib/tour/legacy-session';

type TourDates = {
  start_date?: string | null;
  end_date?: string | null;
};

type SessionRow = {
  id: string;
  start_at: string;
};

/** Как в каталоге: тур с end_date в прошлом не показываем. */
export function isTourEndedByEndDate(
  tour: TourDates,
  now: Date = new Date()
): boolean {
  if (!tour.end_date) return false;
  return new Date(tour.end_date) < now;
}

export function isUpcomingSession(
  startAt: string,
  now: Date = new Date()
): boolean {
  return new Date(startAt) > now;
}

/** Только будущие слоты (для страницы тура и выбора даты). */
export function filterUpcomingSessions<T extends { start_at: string }>(
  sessions: T[],
  now: Date = new Date()
): T[] {
  return sessions.filter((s) => isUpcomingSession(s.start_at, now));
}

/**
 * Тур с реальными слотами в БД доступен только если есть хотя бы один будущий выезд.
 * Без слотов — по датам строки тура (как в каталоге по end_date).
 */
export function isTourVisibleInPublicCatalog(
  tour: TourDates,
  sessions: SessionRow[],
  now: Date = new Date()
): boolean {
  if (isTourEndedByEndDate(tour, now)) return false;

  const realSessions = sessions.filter((s) => s.id !== LEGACY_TOUR_SESSION_ID);
  if (realSessions.length > 0) {
    return realSessions.some((s) => isUpcomingSession(s.start_at, now));
  }

  if (tour.start_date && new Date(tour.start_date) <= now) {
    if (!tour.end_date) return true;
    return new Date(tour.end_date) >= now;
  }

  return true;
}

type CatalogTourRow = TourDates & { id: string };

/** Оставляет в каталоге только туры с актуальными выездами (если слоты есть в БД). */
export async function filterCatalogToursByUpcomingSessions<T extends CatalogTourRow>(
  supabase: SupabaseClient,
  tours: T[]
): Promise<T[]> {
  if (tours.length === 0) return tours;

  const tourIds = tours.map((t) => t.id);
  const { data: sessionRows, error } = await supabase
    .from('tour_sessions')
    .select('id, tour_id, start_at')
    .eq('status', 'active')
    .in('tour_id', tourIds);

  if (error) {
    console.error('filterCatalogToursByUpcomingSessions:', error);
    return tours;
  }

  const sessionsByTourId = new Map<string, SessionRow[]>();
  for (const row of sessionRows || []) {
    const list = sessionsByTourId.get(row.tour_id) ?? [];
    list.push({ id: row.id, start_at: row.start_at });
    sessionsByTourId.set(row.tour_id, list);
  }

  return tours.filter((tour) =>
    isTourVisibleInPublicCatalog(tour, sessionsByTourId.get(tour.id) ?? [])
  );
}
