import { TOUR_WALL_CLOCK_TZ } from '@/lib/date/tour-timestamp';
import { moscowNowParts } from '@/lib/tour/moscow-wall-clock';

/** Ключ дня YYYY-MM-DD по Москве для слота. */
export function sessionMoscowDayKey(startAt: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TOUR_WALL_CLOCK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startAt));
}

/** День недели по Москве: 0=вс … 6=сб (как Date.getDay()). */
export function sessionMoscowWeekday(startAt: string): number {
  return moscowNowParts(new Date(startAt)).weekday;
}
