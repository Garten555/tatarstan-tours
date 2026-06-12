import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { complementTourWeekdays } from '@/lib/tour/auto-schedule-config';
import { moscowWallClockToIso } from '@/lib/tour/moscow-wall-clock';
import { sessionMoscowWeekday } from '@/lib/tour/session-moscow-day';

export function resolveGuideRestWeekdays(config: TourAutoScheduleConfig): number[] {
  if (config.guide_rest_auto) {
    return complementTourWeekdays(config.weekdays);
  }
  return [...config.guide_rest_weekdays].sort((a, b) => a - b);
}

export function syncGuideRestFromTourWeekdays(
  config: Pick<TourAutoScheduleConfig, 'weekdays' | 'guide_rest_auto' | 'guide_rest_weekdays'>
): number[] {
  if (!config.guide_rest_auto) return config.guide_rest_weekdays;
  return complementTourWeekdays(config.weekdays);
}

/** N-й такой день недели в месяце (1 = первая суббота и т.д.). */
export function tourWeekdayOccurrenceInMonth(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  const targetWeekday = sessionMoscowWeekday(moscowWallClockToIso(y, m, d, 12, 0));
  let count = 0;
  const daysInMonth = new Date(y, m, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = moscowWallClockToIso(y, m, day, 12, 0);
    if (sessionMoscowWeekday(iso) === targetWeekday) {
      count += 1;
      if (day === d) return count;
    }
  }
  return 1;
}

/**
 * На туровых днях чередуем отдых: не все гиды работают каждую субботу.
 * При 2 гидах: 1-я суббота — отдых у одного, 2-я — у другого.
 */
export function isGuideRotatingRestOnTourDay(params: {
  guideId: string;
  slotWeekday: number;
  slotDayKey: string;
  guideIds: string[];
  config: TourAutoScheduleConfig;
}): boolean {
  const { guideId, slotWeekday, slotDayKey, guideIds, config } = params;

  if (!config.guide_rotate_rest_on_tour_days || guideIds.length <= 1) return false;
  if (!config.weekdays.includes(slotWeekday)) return false;

  const sorted = [...guideIds].sort((a, b) => a.localeCompare(b));
  const guideIndex = sorted.indexOf(guideId);
  if (guideIndex < 0) return false;

  const occurrence = tourWeekdayOccurrenceInMonth(slotDayKey);
  const restGuideIndex = (occurrence - 1) % sorted.length;
  return guideIndex === restGuideIndex;
}

export function isGuideAvailableForSlot(params: {
  guideId: string;
  slotWeekday: number;
  slotDayKey: string;
  guideIds: string[];
  config: TourAutoScheduleConfig;
}): boolean {
  const restDays = resolveGuideRestWeekdays(params.config);
  if (restDays.includes(params.slotWeekday)) return false;
  if (
    isGuideRotatingRestOnTourDay({
      guideId: params.guideId,
      slotWeekday: params.slotWeekday,
      slotDayKey: params.slotDayKey,
      guideIds: params.guideIds,
      config: params.config,
    })
  ) {
    return false;
  }
  return true;
}
