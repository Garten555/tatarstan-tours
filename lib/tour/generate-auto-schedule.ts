import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { parseTimeHHmm } from '@/lib/tour/auto-schedule-config';
import type { BusyGuideSession } from '@/lib/tour/guide-schedule-conflict';
import { guideHasConflict } from '@/lib/tour/guide-schedule-conflict';
import { addMoscowCalendarDays, moscowNowParts, moscowWallClockToIso } from '@/lib/tour/moscow-wall-clock';
import { sameInstant, sessionEndMs } from '@/lib/tour/schedule-slot';

export type ExistingTourSession = {
  id?: string;
  start_at: string;
  end_at: string | null;
  guide_id?: string | null;
};

export type GeneratedSlot = {
  start_at: string;
  end_at: string;
  guide_id: string;
};

export type GenerateScheduleResult = {
  newSlots: GeneratedSlot[];
  existingFutureCount: number;
  targetSlots: number;
  skippedNoGuide: number;
  skippedDuplicate: number;
};

function countFutureSessions(sessions: ExistingTourSession[], nowMs: number): number {
  return sessions.filter((s) => new Date(s.start_at).getTime() > nowMs).length;
}

function tourHasSlotAt(
  sessions: ExistingTourSession[],
  startIso: string
): boolean {
  return sessions.some((s) => sameInstant(s.start_at, startIso));
}

function pickGuide(
  guideIds: string[],
  busy: BusyGuideSession[],
  startMs: number,
  endMs: number,
  config: TourAutoScheduleConfig,
  busyCounts: Map<string, number>,
  roundRobinIndex: number
): string | null {
  if (guideIds.length === 0) return null;

  const free = guideIds.filter(
    (id) => !guideHasConflict(busy, id, startMs, endMs)
  );
  if (free.length === 0) return null;

  if (config.guide_strategy === 'round_robin') {
    const ordered = [...free].sort((a, b) => a.localeCompare(b));
    return ordered[roundRobinIndex % ordered.length];
  }

  free.sort((a, b) => {
    const ca = busyCounts.get(a) ?? 0;
    const cb = busyCounts.get(b) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });
  return free[0];
}

/**
 * Добавляет только недостающие будущие слоты (существующие не трогает).
 */
export function generateTourScheduleSlots(params: {
  config: TourAutoScheduleConfig;
  existingSessions: ExistingTourSession[];
  guideIds: string[];
  busySessions: BusyGuideSession[];
  now?: Date;
}): GenerateScheduleResult {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const { config, existingSessions, guideIds, busySessions } = params;

  const existingFutureCount = countFutureSessions(existingSessions, nowMs);
  const need = Math.max(0, config.slots_ahead - existingFutureCount);

  const newSlots: GeneratedSlot[] = [];
  let skippedNoGuide = 0;
  let skippedDuplicate = 0;
  let roundRobinIndex = 0;

  const busyCounts = new Map<string, number>();
  for (const g of guideIds) busyCounts.set(g, 0);
  for (const row of busySessions) {
    if (!row.guide_id) continue;
    busyCounts.set(row.guide_id, (busyCounts.get(row.guide_id) ?? 0) + 1);
  }

  const startParts = moscowNowParts(now);
  let cursor = addMoscowCalendarDays(
    startParts.year,
    startParts.month,
    startParts.day,
    1
  );

  const mutableBusy = [...busySessions];
  const allSessions = [...existingSessions];

  for (let dayOffset = 0; dayOffset <= config.horizon_days && newSlots.length < need; dayOffset++) {
    if (dayOffset > 0) {
      cursor = addMoscowCalendarDays(
        startParts.year,
        startParts.month,
        startParts.day,
        dayOffset + 1
      );
    }

    if (!config.weekdays.includes(cursor.weekday)) continue;

    for (const timeStr of config.start_times) {
      if (newSlots.length >= need) break;

      const tm = parseTimeHHmm(timeStr);
      if (!tm) continue;

      const startIso = moscowWallClockToIso(
        cursor.year,
        cursor.month,
        cursor.day,
        tm.h,
        tm.m
      );
      const startMs = new Date(startIso).getTime();
      if (startMs <= nowMs) continue;

      if (tourHasSlotAt(allSessions, startIso)) {
        skippedDuplicate += 1;
        continue;
      }

      const endIso = new Date(
        startMs + config.duration_minutes * 60_000
      ).toISOString();
      const endMs = new Date(endIso).getTime();

      const guideId = pickGuide(
        guideIds,
        mutableBusy,
        startMs,
        endMs,
        config,
        busyCounts,
        roundRobinIndex
      );

      if (!guideId) {
        skippedNoGuide += 1;
        continue;
      }

      roundRobinIndex += 1;
      busyCounts.set(guideId, (busyCounts.get(guideId) ?? 0) + 1);

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
      });
      mutableBusy.push({
        id: `draft-${newSlots.length}`,
        guide_id: guideId,
        start_at: startIso,
        end_at: endIso,
      });
    }
  }

  return {
    newSlots,
    existingFutureCount,
    targetSlots: config.slots_ahead,
    skippedNoGuide,
    skippedDuplicate,
  };
}
