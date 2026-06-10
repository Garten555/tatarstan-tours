import { isBookingDeparturePast } from '@/lib/bookings/booking-completion';

/**
 * Можно ли оставить отзыв по брони (логика совпадает с «Мои бронирования»).
 */
export type BookingForReview = {
  status: string;
  session_id?: string | null;
  departure_start_at?: string | null;
  departure_end_at?: string | null;
  schedule_superseded_at?: string | null;
  tour_session?: { start_at?: string | null; end_at?: string | null } | null;
  tour?: {
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
};

/** Тур по брони фактически завершён (дата выезда/окончания уже прошла). */
export function isTourCompletedForReview(
  booking: BookingForReview,
  now: number = Date.now()
): boolean {
  return isBookingDeparturePast(booking, now);
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
