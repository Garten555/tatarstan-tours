import {
  getBookingDepartureEndIso,
  getBookingDepartureStartIso,
} from '@/lib/bookings/booking-departure';

/**
 * Можно ли оставить отзыв по брони (логика совпадает с «Мои бронирования»).
 */
export type BookingForReview = {
  status: string;
  session_id?: string | null;
  departure_start_at?: string | null;
  departure_end_at?: string | null;
  tour_session?: { start_at?: string | null; end_at?: string | null } | null;
  tour?: {
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
};

function parseMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Тур по брони фактически завершён (дата выезда/окончания уже прошла). */
export function isTourCompletedForReview(
  booking: BookingForReview,
  now: number = Date.now()
): boolean {
  if (booking.tour?.status === 'completed') {
    return true;
  }

  const endIso = getBookingDepartureEndIso(booking);
  const endMs = parseMs(endIso);
  if (endMs !== null && endMs <= now) {
    return true;
  }

  const startIso = getBookingDepartureStartIso(booking);
  const startMs = parseMs(startIso);
  if (startMs !== null && startMs <= now && endMs === null) {
    return true;
  }

  return false;
}

/** Статус для UI и отчётов: прошедший выезд → completed (кроме отменённых). */
export function getEffectiveBookingStatus(booking: BookingForReview): string {
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return booking.status;
  }
  if (isTourCompletedForReview(booking)) {
    return 'completed';
  }
  return booking.status;
}

export function canLeaveReviewForBooking(booking: BookingForReview): boolean {
  const effective = getEffectiveBookingStatus(booking);
  return effective === 'completed' || effective === 'cancelled';
}
