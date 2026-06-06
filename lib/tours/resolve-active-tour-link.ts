import type { SupabaseClient } from '@supabase/supabase-js';

import { groupKey, pickCanonicalTour, type TourRowForDedupe } from '@/lib/tours/listing-dedupe';
import {
  isTourPageLinkable,
  isTourVisibleInPublicCatalog,
  type CatalogTourRow,
} from '@/lib/tours/tour-public-visibility';

export type ActiveTourLink = {
  slug: string;
  title: string;
  participatedAt: string | null;
  /** Другая строка tours с тем же маршрутом и новой датой */
  isRelaunched: boolean;
};

type PastTourRow = TourRowForDedupe & {
  slug: string;
  status?: string | null;
};

type SessionRow = { id: string; start_at: string; tour_id: string };

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

function isLinkableWithSessions(
  tour: PastTourRow,
  sessions: { id: string; start_at: string }[]
): boolean {
  return (
    isTourPageLinkable(tour) ||
    isTourVisibleInPublicCatalog(tour, sessions)
  );
}

/** Активная ссылка на каталог для прошедшего тура (тот же slug или «перезапуск»). */
export async function resolveActiveTourLinkForPastTour(
  supabase: SupabaseClient,
  pastTour: PastTourRow
): Promise<ActiveTourLink | null> {
  const batch = await resolveActiveTourLinksBatch(supabase, [pastTour]);
  return batch.get(pastTour.id) ?? null;
}

export async function resolveActiveTourLinksBatch(
  supabase: SupabaseClient,
  pastTours: PastTourRow[]
): Promise<Map<string, ActiveTourLink | null>> {
  const result = new Map<string, ActiveTourLink | null>();
  if (pastTours.length === 0) return result;

  const needsSibling = new Map<string, PastTourRow[]>();

  for (const tour of pastTours) {
    if (isTourPageLinkable(tour)) {
      result.set(tour.id, {
        slug: tour.slug,
        title: tour.title,
        participatedAt: tour.start_date ?? null,
        isRelaunched: false,
      });
      continue;
    }
    const key = groupKey(tour);
    const list = needsSibling.get(key) ?? [];
    list.push(tour);
    needsSibling.set(key, list);
  }

  if (needsSibling.size === 0) return result;

  const groupSamples = [...needsSibling.values()].map((rows) => rows[0]);
  const titleSet = [...new Set(groupSamples.map((t) => normalizeTitle(t.title)).filter(Boolean))];

  if (titleSet.length === 0) {
    for (const rows of needsSibling.values()) {
      for (const row of rows) result.set(row.id, null);
    }
    return result;
  }

  const { data: candidateRows, error } = await supabase
    .from('tours')
    .select('id, title, slug, city_id, start_date, end_date, status, created_at, price_per_person')
    .eq('status', 'active')
    .in('title', titleSet);

  if (error) {
    console.error('resolveActiveTourLinksBatch tours:', error);
    for (const rows of needsSibling.values()) {
      for (const row of rows) result.set(row.id, null);
    }
    return result;
  }

  const candidates = ((candidateRows ?? []) as PastTourRow[]).filter((row) =>
    titleSet.includes(normalizeTitle(row.title))
  );

  const candidateIds = candidates.map((c) => c.id);
  const sessionsByTourId = new Map<string, SessionRow[]>();

  if (candidateIds.length > 0) {
    const { data: sessionRows, error: sessionsError } = await supabase
      .from('tour_sessions')
      .select('id, tour_id, start_at')
      .eq('status', 'active')
      .in('tour_id', candidateIds);

    if (sessionsError) {
      console.error('resolveActiveTourLinksBatch sessions:', sessionsError);
    } else {
      for (const row of sessionRows ?? []) {
        const list = sessionsByTourId.get(row.tour_id) ?? [];
        list.push(row as SessionRow);
        sessionsByTourId.set(row.tour_id, list);
      }
    }
  }

  for (const [key, pastRows] of needsSibling) {
    const groupCandidates = candidates.filter((c) => groupKey(c) === key);
    const linkable = groupCandidates.filter((c) =>
      isLinkableWithSessions(c, sessionsByTourId.get(c.id) ?? [])
    );

    const activeTour =
      linkable.length > 0
        ? linkable.reduce((best, cur) => pickCanonicalTour(best, cur))
        : null;

    for (const past of pastRows) {
      if (!activeTour) {
        result.set(past.id, null);
        continue;
      }
      result.set(past.id, {
        slug: activeTour.slug,
        title: activeTour.title,
        participatedAt: past.start_date ?? null,
        isRelaunched: activeTour.id !== past.id,
      });
    }
  }

  return result;
}

export async function attachActiveTourLinksToParticipatedRows<
  T extends { tour_id: string; tour: PastTourRow | null },
>(supabase: SupabaseClient, rows: T[]): Promise<(T & { activeTourLink: ActiveTourLink | null })[]> {
  const tours = rows.map((r) => r.tour).filter(Boolean) as PastTourRow[];
  const links = await resolveActiveTourLinksBatch(supabase, tours);

  return rows.map((row) => ({
    ...row,
    activeTourLink: row.tour ? links.get(row.tour.id) ?? null : null,
  }));
}

export async function attachActiveTourLinksToAchievements<
  T extends { tour?: PastTourRow | null },
>(supabase: SupabaseClient, achievements: T[]): Promise<(T & { activeTourLink: ActiveTourLink | null })[]> {
  const tours = achievements.map((a) => a.tour).filter(Boolean) as PastTourRow[];
  const links = await resolveActiveTourLinksBatch(supabase, tours);

  return achievements.map((achievement) => ({
    ...achievement,
    activeTourLink: achievement.tour ? links.get(achievement.tour.id) ?? null : null,
  }));
}

export type { PastTourRow as TourForActiveLink, CatalogTourRow };
