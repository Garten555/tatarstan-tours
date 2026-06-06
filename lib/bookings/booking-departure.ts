import { isSessionBookable } from '@/lib/tours/tour-public-visibility';

type BookingWithDeparture = {
  departure_start_at?: string | null;
  departure_end_at?: string | null;
  tour_session?: { start_at?: string | null; end_at?: string | null } | null;
  tour?: { start_date?: string | null; end_date?: string | null } | null;
};

/** Фактическое время выезда по брони (слот → departure → start_date тура). */
export function getBookingDepartureStartIso(booking: BookingWithDeparture): string | null {
  return (
    booking.departure_start_at ||
    booking.tour_session?.start_at ||
    booking.tour?.start_date ||
    null
  );
}

export function getBookingDepartureEndIso(booking: BookingWithDeparture): string | null {
  return (
    booking.departure_end_at ||
    booking.tour_session?.end_at ||
    booking.tour?.end_date ||
    null
  );
}

export function isBookingDepartureUpcoming(
  booking: BookingWithDeparture,
  now: Date = new Date()
): boolean {
  const start = getBookingDepartureStartIso(booking);
  if (!start) return false;
  return isSessionBookable(start, now);
}

/** confirmed с прошедшим выездом → в «состоявшиеся» для блога и бейджей. */
export function partitionBookingsByDeparture<T extends { status?: string; tour?: unknown }>(
  bookings: T[]
): { completed: T[]; upcoming: T[] } {
  const completed: T[] = [];
  const upcoming: T[] = [];

  for (const b of bookings) {
    if (!b?.tour) continue;
    if (b.status === 'completed') {
      completed.push(b);
    } else if (b.status === 'confirmed') {
      if (isBookingDepartureUpcoming(b as BookingWithDeparture)) {
        upcoming.push(b);
      } else {
        completed.push(b);
      }
    }
  }

  return { completed, upcoming };
}
