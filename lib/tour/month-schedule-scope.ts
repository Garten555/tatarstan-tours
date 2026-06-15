import { addMoscowCalendarDays, moscowNowParts } from '@/lib/tour/moscow-wall-clock';
import { sessionInTargetMonth } from '@/lib/tour/month-schedule';
import { isUpcomingSession } from '@/lib/tours/tour-public-visibility';
import type { ExistingTourSession } from '@/lib/tour/generate-auto-schedule';

export type MonthScheduleScope = 'single' | 'all_scheduled';

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function sessionMonthKey(startIso: string): string {
  const parts = moscowNowParts(new Date(startIso));
  return formatMonthKey(parts.year, parts.month);
}

export function currentMonthKey(now: Date = new Date()): string {
  const parts = moscowNowParts(now);
  return formatMonthKey(parts.year, parts.month);
}

/** Месяцы от «сегодня» вперёд на horizonDays (МСК). */
export function enumerateMonthsInHorizon(
  horizonDays: number,
  now: Date = new Date()
): string[] {
  const start = moscowNowParts(now);
  const months = new Set<string>();

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const d = addMoscowCalendarDays(start.year, start.month, start.day, offset);
    months.add(formatMonthKey(d.year, d.month));
  }

  return [...months].sort();
}

function monthHasUpcomingSession(
  sessions: ExistingTourSession[],
  year: number,
  month: number,
  now: Date
): boolean {
  return sessions.some(
    (s) =>
      sessionInTargetMonth(s.start_at, year, month) &&
      isUpcomingSession(s.start_at, now)
  );
}

/**
 * Какие месяцы обрабатывать:
 * - single — только выбранный;
 * - all_scheduled — все месяцы, где у тура уже есть выезды (+ горизонт, если выездов нет).
 */
export function resolveMonthsForAutoSchedule(params: {
  scope: MonthScheduleScope;
  anchorMonth: string;
  existingSessions: ExistingTourSession[];
  horizonDays: number;
  now?: Date;
}): string[] {
  const now = params.now ?? new Date();
  const anchor = params.anchorMonth.trim();

  if (params.scope === 'single') {
    return /^\d{4}-\d{2}$/.test(anchor) ? [anchor] : [];
  }

  const fromSessions = new Set<string>();
  for (const s of params.existingSessions) {
    fromSessions.add(sessionMonthKey(s.start_at));
  }

  const current = currentMonthKey(now);
  let months = [...fromSessions].sort().filter((key) => {
    if (key >= current) return true;
    const [y, m] = key.split('-').map(Number);
    return monthHasUpcomingSession(params.existingSessions, y, m, now);
  });

  if (months.length === 0) {
    months = enumerateMonthsInHorizon(params.horizonDays, now);
  }

  if (anchor && /^\d{4}-\d{2}$/.test(anchor) && !months.includes(anchor)) {
    months.push(anchor);
  }

  return [...new Set(months)].sort();
}
