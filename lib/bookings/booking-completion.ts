import type { BookingForReview } from '@/lib/bookings/review-eligibility';

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Выезд по этой брони уже в прошлом (слот/departure важнее дат всего тура). */
export function isBookingDeparturePast(
  booking: BookingForReview,
  now: number = Date.now()
): boolean {
  if (booking.tour?.status === 'completed') {
    return true;
  }

  const sessionEnd = parseMs(booking.tour_session?.end_at);
  if (sessionEnd !== null) {
    return sessionEnd <= now;
  }

  const departureEnd = parseMs(booking.departure_end_at);
  if (departureEnd !== null) {
    return departureEnd <= now;
  }

  const sessionStart = parseMs(booking.tour_session?.start_at);
  const departureStart = parseMs(booking.departure_start_at);
  const slotStart = departureStart ?? sessionStart;
  if (slotStart !== null && slotStart <= now) {
    return true;
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
