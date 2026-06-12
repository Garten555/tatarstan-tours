export type GuidePickStrategy = 'least_busy' | 'round_robin';

export type TourAutoScheduleConfig = {
  /** Дни недели: 0=вс, 1=пн … 6=сб (как Date.getDay()) */
  weekdays: number[];
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
  weekdays: [6, 0],
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

  if (Array.isArray(o.start_times)) {
    const times = o.start_times
      .map((t) => String(t).trim())
      .filter((t) => parseTimeHHmm(t));
    if (times.length > 0) base.start_times = times;
  }

  const duration = Number(o.duration_minutes);
  if (Number.isFinite(duration) && duration >= 30 && duration <= 24 * 60) {
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
