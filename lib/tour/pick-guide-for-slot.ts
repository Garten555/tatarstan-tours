import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import {
  guideHasConflict,
  type BusyGuideSession,
} from '@/lib/tour/guide-schedule-conflict';
import {
  isGuideAvailableForSlot,
  resolveGuideRestWeekdays,
} from '@/lib/tour/guide-rest-schedule';

/**
 * Подбирает гида на слот с учётом конфликтов, выходных и стратегии из шаблона.
 * Сначала уважает чередование отдыха; если свободных нет — ослабляет только чередование
 * (фиксированные выходные остаются).
 */
export function pickGuideForSlot(
  guideIds: string[],
  busy: BusyGuideSession[],
  startMs: number,
  endMs: number,
  config: TourAutoScheduleConfig,
  busyCounts: Map<string, number>,
  roundRobinIndex: number,
  slotDayKey: string,
  slotWeekday: number,
  options?: { excludeSessionId?: string }
): string | null {
  if (guideIds.length === 0) return null;

  const excludeSessionId = options?.excludeSessionId;

  const matchesSlot = (id: string, respectRotatingRest: boolean) => {
    if (respectRotatingRest) {
      if (
        !isGuideAvailableForSlot({
          guideId: id,
          slotWeekday,
          slotDayKey,
          guideIds,
          config,
        })
      ) {
        return false;
      }
    } else if (resolveGuideRestWeekdays(config).includes(slotWeekday)) {
      return false;
    }
    return !guideHasConflict(busy, id, startMs, endMs, excludeSessionId);
  };

  let free = guideIds.filter((id) => matchesSlot(id, true));
  if (free.length === 0) {
    free = guideIds.filter((id) => matchesSlot(id, false));
  }
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
