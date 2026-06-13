export const ALL_WEEKDAY_NUMBERS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Дни без туров — дополнение к рабочим дням шаблона. */
export function complementTourWeekdays(tourWeekdays: number[]): number[] {
  const tourSet = new Set(tourWeekdays);
  return ALL_WEEKDAY_NUMBERS.filter((d) => !tourSet.has(d));
}

export type GuidePickStrategy = 'least_busy' | 'round_robin';

export type TourAutoScheduleConfig = {
  /** Дни недели: 0=вс, 1=пн … 6=сб (как Date.getDay()) — рабочие дни туров. */
  weekdays: number[];
  /** Авто: отдых гида = все дни, где нет туров по шаблону. */
  guide_rest_auto: boolean;
  /** Дни отдыха гида (если guide_rest_auto=false). */
  guide_rest_weekdays: number[];
  /** На туровых днях чередовать отдых между гидами. */
  guide_rotate_rest_on_tour_days: boolean;
  /** Время начала по Москве, HH:mm */
  start_times: string[];
  duration_minutes: number;
  /** Сколько будущих слотов держать на тур */
  slots_ahead: number;
  /** На сколько дней вперёд искать окна */
  horizon_days: number;
  guide_strategy: GuidePickStrategy;
};

export const TOUR_AUTO_SCHEDULE_SETTINGS_KEY = 'tour_auto_schedule';

export const DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG: TourAutoScheduleConfig = {
  weekdays: [1, 2, 3, 4, 5, 6],
  guide_rest_auto: true,
  guide_rest_weekdays: [0],
  guide_rotate_rest_on_tour_days: false,
  start_times: ['10:00'],
  duration_minutes: 180,
  slots_ahead: 8,
  horizon_days: 56,
  guide_strategy: 'least_busy',
};

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function parseTimeHHmm(value: string): { h: number; m: number } | null {
  const m = value.trim().match(TIME_RE);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

export function normalizeTourAutoScheduleConfig(
  raw: unknown
): TourAutoScheduleConfig {
  const base = { ...DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG };
  if (!raw || typeof raw !== 'object') return base;

  const o = raw as Record<string, unknown>;

  if (Array.isArray(o.weekdays)) {
    const days = o.weekdays
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (days.length > 0) base.weekdays = [...new Set(days)];
  }

  if (typeof o.guide_rest_auto === 'boolean') {
    base.guide_rest_auto = o.guide_rest_auto;
  }

  if (Array.isArray(o.guide_rest_weekdays)) {
    const restDays = o.guide_rest_weekdays
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (restDays.length > 0) base.guide_rest_weekdays = [...new Set(restDays)];
  }

  if (typeof o.guide_rotate_rest_on_tour_days === 'boolean') {
    base.guide_rotate_rest_on_tour_days = o.guide_rotate_rest_on_tour_days;
  }

  if (base.guide_rest_auto) {
    base.guide_rest_weekdays = complementTourWeekdays(base.weekdays);
    /** При авто-выходных (дни без туров) гиды работают все туровые дни; ротация не нужна. */
    base.guide_rotate_rest_on_tour_days = false;
  }

  if (Array.isArray(o.start_times)) {
    const times = o.start_times
      .map((t) => String(t).trim())
      .filter((t) => parseTimeHHmm(t));
    if (times.length > 0) base.start_times = times;
  }

  const duration = Number(o.duration_minutes);
  if (Number.isFinite(duration) && duration >= 60 && duration <= 30 * 24 * 60) {
    base.duration_minutes = Math.round(duration);
  }

  const slots = Number(o.slots_ahead);
  if (Number.isFinite(slots) && slots >= 1 && slots <= 52) {
    base.slots_ahead = Math.round(slots);
  }

  const horizon = Number(o.horizon_days);
  if (Number.isFinite(horizon) && horizon >= 7 && horizon <= 365) {
    base.horizon_days = Math.round(horizon);
  }

  if (o.guide_strategy === 'least_busy' || o.guide_strategy === 'round_robin') {
    base.guide_strategy = o.guide_strategy;
  }

  return base;
}

/** Для UI: длительность выезда (дни + часы), в БД хранится duration_minutes. */
export function durationMinutesToParts(totalMinutes: number): {
  days: number;
  hours: number;
} {
  const m = Math.max(0, Math.round(totalMinutes));
  return {
    days: Math.floor(m / 1440),
    hours: Math.floor((m % 1440) / 60),
  };
}

export function durationPartsToMinutes(days: number, hours: number): number {
  const d = Math.max(0, Math.min(30, Math.round(Number(days) || 0)));
  const h = Math.max(0, Math.min(23, Math.round(Number(hours) || 0)));
  const total = d * 1440 + h * 60;
  if (total < 60) return 60;
  if (total > 30 * 24 * 60) return 30 * 24 * 60;
  return total;
}
