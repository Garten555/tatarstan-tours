import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { complementTourWeekdays } from '@/lib/tour/auto-schedule-config';
import { moscowWallClockToIso } from '@/lib/tour/moscow-wall-clock';
import { moscowWeekStart, parseMoscowDayKey } from '@/lib/tour/team-schedule-range';

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

/** Индекс московской недели (понедельник) — для стабильного чередования. */
export function moscowIsoWeekIndex(dayKey: string): number {
  const parsed = parseMoscowDayKey(dayKey);
  if (!parsed) return 0;
  const weekStart = moscowWeekStart(parsed.year, parsed.month, parsed.day);
  const mondayMs = new Date(
    moscowWallClockToIso(weekStart.year, weekStart.month, weekStart.day, 12, 0)
  ).getTime();
  return Math.floor(mondayMs / (7 * 86_400_000));
}

/**
 * Туровый день недели, когда гид отдыхает в эту календарную неделю.
 * При 6 рабочих днях (пн–сб) и 2 гидах: у каждого свой день без выезда + общий воскресенье.
 */
export function guideTourDayRestWeekdayThisWeek(params: {
  guideId: string;
  slotDayKey: string;
  guideIds: string[];
  config: TourAutoScheduleConfig;
}): number | null {
  if (!params.config.guide_rotate_rest_on_tour_days || params.guideIds.length === 0) {
    return null;
  }

  const tourDays = [...params.config.weekdays].sort((a, b) => a - b);
  if (tourDays.length === 0) return null;

  const sorted = [...params.guideIds].sort((a, b) => a.localeCompare(b));
  const guideIndex = sorted.indexOf(params.guideId);
  if (guideIndex < 0) return null;

  const weekIdx = moscowIsoWeekIndex(params.slotDayKey);
  const restOffset = (guideIndex + weekIdx) % tourDays.length;
  return tourDays[restOffset] ?? null;
}

/**
 * На туровых днях — по одному выходному в неделю на гида (чередование по пн–сб и т.д.).
 */
export function isGuideRotatingRestOnTourDay(params: {
  guideId: string;
  slotWeekday: number;
  slotDayKey: string;
  guideIds: string[];
  config: TourAutoScheduleConfig;
}): boolean {
  const { guideId, slotWeekday, slotDayKey, guideIds, config } = params;

  if (!config.guide_rotate_rest_on_tour_days || guideIds.length === 0) return false;
  if (!config.weekdays.includes(slotWeekday)) return false;

  const restWeekday = guideTourDayRestWeekdayThisWeek({
    guideId,
    slotDayKey,
    guideIds,
    config,
  });
  return restWeekday != null && slotWeekday === restWeekday;
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
