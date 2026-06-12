import {
  addMoscowCalendarDays,
  moscowNowParts,
  moscowWallClockToIso,
} from '@/lib/tour/moscow-wall-clock';

export type MoscowDayKey = {
  year: number;
  month: number;
  day: number;
  key: string;
  weekday: number;
};

export function moscowDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Понедельник недели, в которую попадает дата (Москва). */
export function moscowWeekStart(
  year: number,
  month: number,
  day: number
): MoscowDayKey {
  const noonIso = moscowWallClockToIso(year, month, day, 12, 0);
  const anchor = moscowNowParts(new Date(noonIso));
  const daysFromMonday = anchor.weekday === 0 ? 6 : anchor.weekday - 1;
  const monday = addMoscowCalendarDays(anchor.year, anchor.month, anchor.day, -daysFromMonday);
  return {
    year: monday.year,
    month: monday.month,
    day: monday.day,
    weekday: monday.weekday,
    key: moscowDayKey(monday.year, monday.month, monday.day),
  };
}

export function moscowWeekDays(weekStart: MoscowDayKey): MoscowDayKey[] {
  const days: MoscowDayKey[] = [];
  let cursor = weekStart;
  for (let i = 0; i < 7; i++) {
    days.push({ ...cursor });
    if (i < 6) {
      const next = addMoscowCalendarDays(cursor.year, cursor.month, cursor.day, 1);
      cursor = {
        year: next.year,
        month: next.month,
        day: next.day,
        weekday: next.weekday,
        key: moscowDayKey(next.year, next.month, next.day),
      };
    }
  }
  return days;
}

/** Границы недели [from, to) в UTC ISO по московскому календарю. */
export function moscowWeekRangeIso(weekStart: MoscowDayKey): { from: string; to: string } {
  const from = moscowWallClockToIso(weekStart.year, weekStart.month, weekStart.day, 0, 0);
  const nextMonday = addMoscowCalendarDays(weekStart.year, weekStart.month, weekStart.day, 7);
  const to = moscowWallClockToIso(nextMonday.year, nextMonday.month, nextMonday.day, 0, 0);
  return { from, to };
}

export function parseMoscowDayKey(value: string | null | undefined): MoscowDayKey | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const noonIso = moscowWallClockToIso(y, m, d, 12, 0);
  const parts = moscowNowParts(new Date(noonIso));
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    weekday: parts.weekday,
    key: moscowDayKey(parts.year, parts.month, parts.day),
  };
}

export function currentMoscowWeekStart(): MoscowDayKey {
  const now = moscowNowParts();
  return moscowWeekStart(now.year, now.month, now.day);
}

export function currentMoscowDay(): MoscowDayKey {
  const now = moscowNowParts();
  return {
    year: now.year,
    month: now.month,
    day: now.day,
    weekday: now.weekday,
    key: moscowDayKey(now.year, now.month, now.day),
  };
}

export function parseMoscowMonthKey(value: string | null | undefined): { year: number; month: number; key: string } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [y, m] = value.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
}

/** Границы месяца [from, to) в UTC ISO по московскому календарю. */
export function moscowMonthRangeIso(year: number, month: number): { from: string; to: string } {
  const from = moscowWallClockToIso(year, month, 1, 0, 0);
  const next =
    month === 12
      ? { year: year + 1, month: 1 }
      : { year, month: month + 1 };
  const to = moscowWallClockToIso(next.year, next.month, 1, 0, 0);
  return { from, to };
}

export type MoscowCalendarCell = MoscowDayKey & { in_month: boolean };

/** Сетка календаря (6 недель, понедельник — первый столбец). */
export function moscowMonthCalendarCells(year: number, month: number): MoscowCalendarCell[] {
  const firstNoon = moscowWallClockToIso(year, month, 1, 12, 0);
  const firstWeekday = moscowNowParts(new Date(firstNoon)).weekday;
  const padStart = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const gridStart = addMoscowCalendarDays(year, month, 1, -padStart);

  const cells: MoscowCalendarCell[] = [];
  let y = gridStart.year;
  let m = gridStart.month;
  let d = gridStart.day;

  for (let i = 0; i < 42; i++) {
    const noonIso = moscowWallClockToIso(y, m, d, 12, 0);
    const parts = moscowNowParts(new Date(noonIso));
    cells.push({
      year: parts.year,
      month: parts.month,
      day: parts.day,
      weekday: parts.weekday,
      key: moscowDayKey(parts.year, parts.month, parts.day),
      in_month: parts.year === year && parts.month === month,
    });
    const next = addMoscowCalendarDays(y, m, d, 1);
    y = next.year;
    m = next.month;
    d = next.day;
  }

  return cells;
}

export function shiftMoscowMonth(year: number, month: number, delta: number): { year: number; month: number; key: string } {
  let y = year;
  let m = month + delta;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}` };
}
