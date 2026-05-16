/**
 * Можно ли оставить отзыв по брони (логика совпадает с «Мои бронирования»).
 */
export type BookingForReview = {
  status: string;
  session_id?: string | null;
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

/** Тур фактически завершён по дате (как isTourCompleted в UserBookings). */
export function isTourCompletedForReview(booking: BookingForReview): boolean {
  if (booking.tour?.status === 'completed') {
    return true;
  }

  const slotEnd = parseMs(booking.tour_session?.end_at);
  if (slotEnd !== null && slotEnd <= Date.now()) {
    return true;
  }

  const completionDate = booking.tour?.end_date || booking.tour?.start_date;
  const tourEnd = parseMs(completionDate);
  if (tourEnd !== null && tourEnd <= Date.now()) {
    return true;
  }

  return false;
}

export function getEffectiveBookingStatus(booking: BookingForReview): string {
  if (isTourCompletedForReview(booking) && booking.status === 'confirmed') {
    return 'completed';
  }
  return booking.status;
}

export function canLeaveReviewForBooking(booking: BookingForReview): boolean {
  const effective = getEffectiveBookingStatus(booking);
  return effective === 'completed' || effective === 'cancelled';
}
