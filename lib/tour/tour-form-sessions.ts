import { isoToMoscowDatetimeLocalInput } from '@/lib/date/tour-timestamp';
import { filterUpcomingSessions } from '@/lib/tours/tour-public-visibility';

export type TourFormSessionInput = {
  id: string;
  start_at: string;
  end_at: string | null;
  guide_id?: string | null;
};

export type TourFormSessionLayout = {
  primarySession: TourFormSessionInput | null;
  primaryStart: string;
  primaryEnd: string;
  extraSessions: TourFormSessionInput[];
};

/** Первый будущий слот — в «Дата начала/окончания»; прошлые слоты не подставляем в основные поля. */
export function resolveTourFormSessionLayout(
  sessions: TourFormSessionInput[] | undefined,
  tourStartDate?: string | null,
  tourEndDate?: string | null
): TourFormSessionLayout {
  const sorted = [...(sessions ?? [])].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const upcoming = filterUpcomingSessions(sorted);
  const primarySession = upcoming[0] ?? null;

  if (primarySession) {
    return {
      primarySession,
      primaryStart: isoToMoscowDatetimeLocalInput(primarySession.start_at),
      primaryEnd: isoToMoscowDatetimeLocalInput(
        primarySession.end_at ?? primarySession.start_at
      ),
      extraSessions: sorted.filter((s) => s.id !== primarySession.id),
    };
  }

  if (tourStartDate) {
    return {
      primarySession: null,
      primaryStart: isoToMoscowDatetimeLocalInput(tourStartDate),
      primaryEnd: isoToMoscowDatetimeLocalInput(tourEndDate ?? tourStartDate),
      extraSessions: sorted,
    };
  }

  const fallback = sorted[0] ?? null;
  return {
    primarySession: fallback,
    primaryStart: fallback ? isoToMoscowDatetimeLocalInput(fallback.start_at) : '',
    primaryEnd: fallback
      ? isoToMoscowDatetimeLocalInput(fallback.end_at ?? fallback.start_at)
      : '',
    extraSessions: sorted.length > 1 ? sorted.slice(1) : [],
  };
}
