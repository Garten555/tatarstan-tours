import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { parseTimeHHmm } from '@/lib/tour/auto-schedule-config';
import type { BusyGuideSession } from '@/lib/tour/guide-schedule-conflict';
import { addMoscowCalendarDays, moscowNowParts, moscowWallClockToIso } from '@/lib/tour/moscow-wall-clock';
import { pickGuideForSlot } from '@/lib/tour/pick-guide-for-slot';
import { sessionMoscowDayKey } from '@/lib/tour/session-moscow-day';
import { sameInstant } from '@/lib/tour/schedule-slot';

export type ExistingTourSession = {
  id?: string;
  start_at: string;
  end_at: string | null;
  guide_id?: string | null;
  status?: string;
};

export type GeneratedSlot = {
  start_at: string;
  end_at: string;
  guide_id: string | null;
};

export type GenerateScheduleResult = {
  newSlots: GeneratedSlot[];
  existingFutureCount: number;
  targetSlots: number;
  skippedNoGuide: number;
  skippedDuplicate: number;
  /** Почему новых слотов 0 (для UI). */
  zeroReason?: 'already_full' | 'no_guides' | 'no_free_days';
};

function countFutureSessions(sessions: ExistingTourSession[], nowMs: number): number {
  return sessions.filter((s) => {
    if ((s as { status?: string }).status === 'cancelled') return false;
    return new Date(s.start_at).getTime() > nowMs;
  }).length;
}

function tourHasSlotAt(
  sessions: ExistingTourSession[],
  startIso: string
): boolean {
  return sessions.some((s) => {
    if (s.status === 'cancelled') return false;
    return sameInstant(s.start_at, startIso);
  });
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

  if (need === 0) {
    return {
      newSlots: [],
      existingFutureCount,
      targetSlots: config.slots_ahead,
      skippedNoGuide: 0,
      skippedDuplicate: 0,
      zeroReason: 'already_full',
    };
  }

  if (guideIds.length === 0) {
    // Слоты без гида — потом назначат вручную или при появлении гидов.
  }

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

      const guideId = pickGuideForSlot(
        guideIds,
        mutableBusy,
        startMs,
        endMs,
        config,
        busyCounts,
        roundRobinIndex,
        sessionMoscowDayKey(startIso),
        cursor.weekday
      );

      if (guideId) {
        roundRobinIndex += 1;
        busyCounts.set(guideId, (busyCounts.get(guideId) ?? 0) + 1);
      } else if (guideIds.length > 0) {
        skippedNoGuide += 1;
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

  let zeroReason: GenerateScheduleResult['zeroReason'];
  if (newSlots.length === 0) {
    if (guideIds.length === 0) zeroReason = 'no_guides';
    else if (skippedNoGuide > 0) zeroReason = 'no_free_days';
    else zeroReason = 'no_free_days';
  }

  return {
    newSlots,
    existingFutureCount,
    targetSlots: config.slots_ahead,
    skippedNoGuide,
    skippedDuplicate,
    zeroReason,
  };
}
