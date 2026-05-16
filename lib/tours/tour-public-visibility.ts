import type { SupabaseClient } from '@supabase/supabase-js';

import { LEGACY_TOUR_SESSION_ID } from '@/lib/tour/legacy-session';
import type { TourRowForDedupe } from '@/lib/tours/listing-dedupe';

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

/** Будущий старт по полям строки tours (повторный запуск после прошлых слотов). */
export function hasScheduledFutureStart(
  tour: TourDates,
  now: Date = new Date()
): boolean {
  if (!tour.start_date) return false;
  const startMs = new Date(tour.start_date).getTime();
  return Number.isFinite(startMs) && startMs > now.getTime();
}

/** Только будущие слоты (для страницы тура и выбора даты). */
export function filterUpcomingSessions<T extends { start_at: string }>(
  sessions: T[],
  now: Date = new Date()
): T[] {
  return sessions.filter((s) => isUpcomingSession(s.start_at, now));
}

/**
 * Каталог и страница тура: end_date в прошлом — скрываем.
 * Есть будущий start_date в tours — показываем (даже если в БД остались только прошлые слоты).
 * Иначе — по будущим tour_sessions или по текущему периоду тура без слотов.
 */
export function isTourVisibleInPublicCatalog(
  tour: TourDates,
  sessions: SessionRow[],
  now: Date = new Date()
): boolean {
  if (isTourEndedByEndDate(tour, now)) return false;

  if (hasScheduledFutureStart(tour, now)) return true;

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

export type CatalogTourRow = TourDates & Pick<TourRowForDedupe, 'id'>;

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
