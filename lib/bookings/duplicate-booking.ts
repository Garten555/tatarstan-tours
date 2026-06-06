import { isTourCompletedForReview, type BookingForReview } from '@/lib/bookings/review-eligibility';

export type BookingDuplicateCheck = BookingForReview & {
  tour_id: string;
  session_id?: string | null;
  departure_end_at?: string | null;
  departure_start_at?: string | null;
};

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function unwrapRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

export function normalizeBookingDuplicateRow(row: Record<string, unknown>): BookingDuplicateCheck {
  return {
    tour_id: String(row.tour_id),
    session_id: row.session_id ? String(row.session_id) : null,
    status: String(row.status ?? ''),
    departure_end_at: (row.departure_end_at as string | null) ?? null,
    departure_start_at: (row.departure_start_at as string | null) ?? null,
    tour_session: unwrapRelation(row.tour_session as BookingForReview['tour_session']),
    tour: unwrapRelation(row.tour as BookingForReview['tour']),
  };
}

/** Бронь уже «прошла» по дате — не мешает новому бронированию. */
export function isBookingPastByDate(booking: BookingDuplicateCheck): boolean {
  if (isTourCompletedForReview(booking)) return true;

  const depEnd = parseMs(booking.departure_end_at);
  if (depEnd !== null && depEnd <= Date.now()) return true;

  const slotEnd = parseMs(booking.tour_session?.end_at);
  if (slotEnd !== null && slotEnd <= Date.now()) return true;

  const slotStart = parseMs(booking.tour_session?.start_at);
  if (slotStart !== null && slotEnd === null && slotStart <= Date.now()) return true;

  const depStart = parseMs(booking.departure_start_at);
  if (depStart !== null && depEnd === null && slotEnd === null && depStart <= Date.now()) {
    return true;
  }

  return false;
}

/** Активная бронь на тот же тур/слот — блокирует повтор. */
export function isBlockingDuplicateBooking(
  booking: BookingDuplicateCheck,
  tourId: string,
  sessionId?: string | null
): boolean {
  if (!['pending', 'confirmed'].includes(booking.status)) return false;
  if (isBookingPastByDate(booking)) return false;
  if (booking.tour_id !== tourId) return false;

  if (sessionId) {
    return booking.session_id === sessionId;
  }

  return !booking.session_id;
}

export const BOOKING_DUPLICATE_SELECT = `
  id,
  status,
  session_id,
  departure_end_at,
  departure_start_at,
  tour:tours!bookings_tour_id_fkey(status, start_date, end_date),
  tour_session:tour_sessions!bookings_session_id_fkey(start_at, end_at)
`;
