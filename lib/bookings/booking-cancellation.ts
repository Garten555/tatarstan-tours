import type { BookingForReview } from '@/lib/bookings/review-eligibility';
import {
  getEffectiveBookingStatus,
  isTourCompletedForReview,
} from '@/lib/bookings/review-eligibility';

/** Можно ли отменить бронирование (пользователь или админ). */
export function canCancelBooking(booking: BookingForReview): boolean {
  return bookingCancellationBlockedReason(booking) === null;
}

/** Причина запрета отмены или null, если отмена разрешена. */
export function bookingCancellationBlockedReason(booking: BookingForReview): string | null {
  if (booking.status === 'cancelled') {
    return 'Бронирование уже отменено';
  }

  if (booking.status === 'completed' || getEffectiveBookingStatus(booking) === 'completed') {
    return 'Нельзя отменить завершённое бронирование';
  }

  if (booking.tour?.status === 'completed') {
    return 'Нельзя отменить бронирование: тур уже завершён';
  }

  if (!['pending', 'confirmed'].includes(booking.status)) {
    return 'Это бронирование нельзя отменить';
  }

  if (isTourCompletedForReview(booking)) {
    return 'Нельзя отменить бронирование: тур уже начался или завершён';
  }

  return null;
}
