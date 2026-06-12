import { TOUR_WALL_CLOCK_TZ } from '@/lib/date/tour-timestamp';

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Календарная дата и время в Europe/Moscow → ISO UTC. */
export function moscowWallClockToIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): string {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - MOSCOW_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

/** Компоненты календарной даты «сейчас» в Москве. */
export function moscowNowParts(now = new Date()): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TOUR_WALL_CLOCK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  };
}

/** Добавить calendarDays к дате в Москве. */
export function addMoscowCalendarDays(
  year: number,
  month: number,
  day: number,
  calendarDays: number
): { year: number; month: number; day: number; weekday: number } {
  const noonUtc = moscowWallClockToIso(year, month, day, 12, 0);
  const shifted = new Date(new Date(noonUtc).getTime() + calendarDays * 86_400_000);
  return moscowNowParts(shifted);
}
