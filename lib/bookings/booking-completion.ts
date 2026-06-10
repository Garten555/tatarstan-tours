import type { BookingForReview } from '@/lib/bookings/review-eligibility';

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function isoNorm(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    return new Date(ts).toISOString();
  } catch {
    return String(ts);
  }
}

/** Снимок выезда на брони не совпадает с текущим слотом (перенос расписания). */
export function isBookingScheduleSuperseded(
  booking: Pick<BookingForReview, 'schedule_superseded_at' | 'departure_start_at'> & {
    tour_session?: { start_at?: string | null } | null;
  }
): boolean {
  if (booking.schedule_superseded_at) return true;
  const dep = booking.departure_start_at;
  const sess = booking.tour_session?.start_at;
  if (!dep || !sess) return false;
  return isoNorm(dep) !== isoNorm(sess);
}

/** Выезд по этой брони уже в прошлом (departure snapshot важнее живого слота). */
export function isBookingDeparturePast(
  booking: BookingForReview,
  now: number = Date.now()
): boolean {
  if (booking.tour?.status === 'completed') {
    return true;
  }

  const departureEnd = parseMs(booking.departure_end_at);
  if (departureEnd !== null) {
    return departureEnd <= now;
  }

  const departureStart = parseMs(booking.departure_start_at);
  if (departureStart !== null) {
    return departureStart <= now;
  }

  if (booking.schedule_superseded_at || isBookingScheduleSuperseded(booking)) {
    return false;
  }

  const sessionEnd = parseMs(booking.tour_session?.end_at);
  if (sessionEnd !== null) {
    return sessionEnd <= now;
  }

  const sessionStart = parseMs(booking.tour_session?.start_at);
  if (sessionStart !== null) {
    return sessionStart <= now;
  }

  const tourEnd = parseMs(booking.tour?.end_date);
  if (tourEnd !== null && tourEnd <= now) {
    return true;
  }

  const tourStart = parseMs(booking.tour?.start_date);
  if (tourStart !== null && tourStart <= now && !booking.tour?.end_date) {
    return true;
  }

  return false;
}
