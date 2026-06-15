import {
  roomDepartureStart,
  roomTourLifecycle,
  type RoomTourLifecycle,
} from '@/lib/achievements/dedupe-award-rooms';

export type GuideTourLifecycleFilter = 'all' | RoomTourLifecycle;

export function moscowDateParts(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function tourStartDateKey(iso: string): string {
  const { year, month, day } = moscowDateParts(iso);
  return `${year}-${month}-${day}`;
}

export function tourStartMonthKey(iso: string): string {
  const { year, month } = moscowDateParts(iso);
  return `${year}-${month}`;
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function currentDateKey(): string {
  return tourStartDateKey(new Date().toISOString());
}

export function currentMonthKey(): string {
  return tourStartMonthKey(new Date().toISOString());
}

type FilterableRoom = {
  tour: {
    title: string;
    start_date: string;
    end_date?: string | null;
    city?: { name?: string } | null;
  };
  session_start_at?: string | null;
  session_end_at?: string | null;
};

export function filterGuideTourRooms<T extends FilterableRoom>(
  rooms: T[],
  opts: {
    search: string;
    lifecycle: GuideTourLifecycleFilter;
    monthFilter: string;
    dateFilter: string;
    departureStart?: (room: T) => string;
  }
): T[] {
  const q = opts.search.trim().toLowerCase();
  const departureStart = opts.departureStart ?? ((room: T) => roomDepartureStart(room));

  return rooms.filter((room) => {
    if (opts.lifecycle !== 'all' && roomTourLifecycle(room) !== opts.lifecycle) return false;
    const start = departureStart(room);
    if (opts.dateFilter && tourStartDateKey(start) !== opts.dateFilter) return false;
    if (!opts.dateFilter && opts.monthFilter && tourStartMonthKey(start) !== opts.monthFilter) {
      return false;
    }
    if (!q) return true;
    const title = room.tour.title.toLowerCase();
    const city = room.tour.city?.name?.toLowerCase() ?? '';
    return title.includes(q) || city.includes(q);
  });
}
