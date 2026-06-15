import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { parseTimeHHmm } from '@/lib/tour/auto-schedule-config';
import type { BusyGuideSession } from '@/lib/tour/guide-schedule-conflict';
import type { ExistingTourSession, GeneratedSlot } from '@/lib/tour/generate-auto-schedule';
import { moscowNowParts, moscowWallClockToIso } from '@/lib/tour/moscow-wall-clock';
import { pickGuideForSlot } from '@/lib/tour/pick-guide-for-slot';
import { sessionMoscowDayKey } from '@/lib/tour/session-moscow-day';
import { sameInstant } from '@/lib/tour/schedule-slot';

export type MonthScheduleMode = 'fill' | 'regenerate';

export function parseTargetMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value).trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

export function sessionInTargetMonth(
  startIso: string,
  year: number,
  month: number
): boolean {
  const parts = moscowNowParts(new Date(startIso));
  return parts.year === year && parts.month === month;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function tourHasSlotAt(sessions: ExistingTourSession[], startIso: string): boolean {
  return sessions.some((s) => {
    if (s.status === 'cancelled') return false;
    return sameInstant(s.start_at, startIso);
  });
}

/** Слоты по шаблону только в выбранном календарном месяце (МСК). */
export function generateMonthTourScheduleSlots(params: {
  config: TourAutoScheduleConfig;
  existingSessions: ExistingTourSession[];
  guideIds: string[];
  busySessions: BusyGuideSession[];
  year: number;
  month: number;
  mode: MonthScheduleMode;
  now?: Date;
  /** session_id → есть брони */
  bookedSessionIds?: Set<string>;
}): {
  newSlots: GeneratedSlot[];
  mergedSessions: Array<{
    id?: string;
    start_at: string;
    end_at: string;
    guide_id: string | null;
  }>;
  rescheduledBooked: number;
  removedEmpty: number;
} {
  const {
    config,
    existingSessions,
    guideIds,
    busySessions,
    year,
    month,
    mode,
    bookedSessionIds = new Set(),
  } = params;
  const now = params.now ?? new Date();
  const nowMs = now.getTime();

  const outsideMonth = existingSessions.filter(
    (s) => !sessionInTargetMonth(s.start_at, year, month)
  );
  const inMonth = existingSessions.filter((s) =>
    sessionInTargetMonth(s.start_at, year, month)
  );

  let removedEmpty = 0;
  let keptInMonth = inMonth;

  if (mode === 'regenerate') {
    keptInMonth = inMonth.filter((s) => {
      if (s.id && bookedSessionIds.has(s.id)) return true;
      removedEmpty += 1;
      return false;
    });
  }

  const allSessions = [...outsideMonth, ...keptInMonth];
  const newSlots: GeneratedSlot[] = [];
  const mutableBusy = [...busySessions];
  let roundRobinIndex = 0;

  const busyCounts = new Map<string, number>();
  for (const g of guideIds) busyCounts.set(g, 0);
  for (const row of busySessions) {
    if (!row.guide_id) continue;
    busyCounts.set(row.guide_id, (busyCounts.get(row.guide_id) ?? 0) + 1);
  }

  const lastDay = daysInMonth(year, month);

  for (let day = 1; day <= lastDay; day++) {
    const noonIso = moscowWallClockToIso(year, month, day, 12, 0);
    const weekday = moscowNowParts(new Date(noonIso)).weekday;
    if (!config.weekdays.includes(weekday)) continue;

    for (const timeStr of config.start_times) {
      const tm = parseTimeHHmm(timeStr);
      if (!tm) continue;

      const startIso = moscowWallClockToIso(year, month, day, tm.h, tm.m);
      const startMs = new Date(startIso).getTime();
      if (startMs <= nowMs) continue;

      if (tourHasSlotAt(allSessions, startIso)) continue;

      const endIso = new Date(startMs + config.duration_minutes * 60_000).toISOString();
      const endMs = new Date(endIso).getTime();

      const guideId = pickGuideForSlot(
        guideIds,
        mutableBusy,
        startMs,
        endMs,
        config,
        busyCounts,
        roundRobinIndex,
        sessionMoscowDayKey(startIso),
        weekday
      );

      if (guideId) {
        roundRobinIndex += 1;
        busyCounts.set(guideId, (busyCounts.get(guideId) ?? 0) + 1);
      } else if (guideIds.length > 0) {
        continue;
      }

      const slot: GeneratedSlot = {
        start_at: startIso,
        end_at: endIso,
        guide_id: guideId,
      };
      newSlots.push(slot);
      allSessions.push({
        start_at: startIso,
        end_at: endIso,
        guide_id: guideId,
        status: 'active',
      });
      if (guideId) {
        mutableBusy.push({
          id: `draft-${newSlots.length}`,
          guide_id: guideId,
          start_at: startIso,
          end_at: endIso,
        });
      }
    }
  }

  let rescheduledBooked = 0;
  const mergedSessions = [
    ...outsideMonth.map((s) => ({
      id: s.id,
      start_at: s.start_at,
      end_at: s.end_at ?? new Date(new Date(s.start_at).getTime() + config.duration_minutes * 60_000).toISOString(),
      guide_id: s.guide_id ?? null,
    })),
  ];

  if (mode === 'regenerate') {
    for (const s of keptInMonth) {
      const parts = moscowNowParts(new Date(s.start_at));
      const tm = parseTimeHHmm(config.start_times[0] ?? '10:00');
      const newStart =
        tm != null
          ? moscowWallClockToIso(parts.year, parts.month, parts.day, tm.h, tm.m)
          : s.start_at;
      const newEnd = new Date(
        new Date(newStart).getTime() + config.duration_minutes * 60_000
      ).toISOString();
      if (!sameInstant(s.start_at, newStart)) rescheduledBooked += 1;
      mergedSessions.push({
        id: s.id,
        start_at: newStart,
        end_at: newEnd,
        guide_id: s.guide_id ?? null,
      });
    }
  } else {
    for (const s of keptInMonth) {
      mergedSessions.push({
        id: s.id,
        start_at: s.start_at,
        end_at:
          s.end_at ??
          new Date(new Date(s.start_at).getTime() + config.duration_minutes * 60_000).toISOString(),
        guide_id: s.guide_id ?? null,
      });
    }
  }

  for (const slot of newSlots) {
    mergedSessions.push({
      id: undefined,
      start_at: slot.start_at,
      end_at: slot.end_at,
      guide_id: slot.guide_id,
    });
  }

  return { newSlots, mergedSessions, rescheduledBooked, removedEmpty };
}
