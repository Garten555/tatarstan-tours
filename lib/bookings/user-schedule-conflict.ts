import { getBookingDepartureEndIso, getBookingDepartureStartIso } from '@/lib/bookings/booking-departure';
import {
  isBookingPastByDate,
  type BookingDuplicateCheck,
  unwrapRelation,
} from '@/lib/bookings/duplicate-booking';
import { intervalsOverlap, sameInstant, sessionEndMs } from '@/lib/tour/schedule-slot';

const DEFAULT_BOOKING_DURATION_MINUTES = 180;

export type UserBookingScheduleRow = BookingDuplicateCheck & {
  id?: string;
  tour?: { title?: string | null; end_date?: string | null } | null;
};

export function resolveBookingWindowMs(
  booking: UserBookingScheduleRow,
  fallbackDurationMinutes = DEFAULT_BOOKING_DURATION_MINUTES
): { startMs: number; endMs: number } | null {
  const startIso = getBookingDepartureStartIso(booking);
  if (!startIso) return null;

  const startMs = new Date(startIso).getTime();
  if (Number.isNaN(startMs)) return null;

  const endIso = getBookingDepartureEndIso(booking);
  const endMs = sessionEndMs(startMs, endIso, fallbackDurationMinutes);
  return { startMs, endMs };
}

/** Пересечение с другой активной бронью пользователя (другой тур / то же время). */
export function findUserBookingScheduleConflict(
  existing: UserBookingScheduleRow[],
  params: {
    startAt: string;
    endAt?: string | null;
    excludeBookingId?: string;
    excludeTourId?: string;
    excludeSessionId?: string | null;
  },
  fallbackDurationMinutes = DEFAULT_BOOKING_DURATION_MINUTES
): UserBookingScheduleRow | null {
  const newStartMs = new Date(params.startAt).getTime();
  if (Number.isNaN(newStartMs)) return null;

  const newEndMs = sessionEndMs(newStartMs, params.endAt ?? null, fallbackDurationMinutes);

  for (const row of existing) {
    if (params.excludeBookingId && row.id === params.excludeBookingId) continue;
    if (!['pending', 'confirmed'].includes(row.status)) continue;
    if (isBookingPastByDate(row)) continue;

    const sameTourSlot =
      params.excludeTourId &&
      row.tour_id === params.excludeTourId &&
      (params.excludeSessionId
        ? row.session_id === params.excludeSessionId
        : !row.session_id);
    if (sameTourSlot) continue;

    const existingStartIso = getBookingDepartureStartIso(row);
    const window = resolveBookingWindowMs(row, fallbackDurationMinutes);
    if (!window || !existingStartIso) continue;

    const overlaps =
      intervalsOverlap(newStartMs, newEndMs, window.startMs, window.endMs) ||
      sameInstant(params.startAt, existingStartIso);

    if (overlaps) return row;
  }

  return null;
}

export function userScheduleConflictMessage(conflict: UserBookingScheduleRow): string {
  const tourRel = unwrapRelation(conflict.tour);
  const title = tourRel?.title?.trim();
  if (title) {
    return `У вас уже есть бронирование «${title}» на это время. Выберите другую дату или отмените предыдущую бронь.`;
  }
  return 'У вас уже есть бронирование на это время. Выберите другую дату или отмените предыдущую бронь.';
}

export const USER_SCHEDULE_BOOKING_SELECT = `
  id,
  status,
  tour_id,
  session_id,
  departure_end_at,
  departure_start_at,
  tour:tours!bookings_tour_id_fkey(status, start_date, end_date, title),
  tour_session:tour_sessions!bookings_session_id_fkey(start_at, end_at)
`;
