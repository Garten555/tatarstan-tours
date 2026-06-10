import {
  getBookingDepartureEndIso,
  getBookingDepartureStartIso,
} from '@/lib/bookings/booking-departure';
import { isBookingScheduleSuperseded } from '@/lib/bookings/booking-completion';

export type BookingDepartureDisplayInput = {
  departure_start_at?: string | null;
  departure_end_at?: string | null;
  schedule_superseded_at?: string | null;
  tour_session?: { start_at?: string | null; end_at?: string | null } | null;
  tour?: { start_date?: string | null; end_date?: string | null } | null;
};

export function getBookingDepartureStartForDisplay(
  booking: BookingDepartureDisplayInput
): string | null {
  return getBookingDepartureStartIso(booking);
}

export function getBookingDepartureEndForDisplay(
  booking: BookingDepartureDisplayInput
): string | null {
  return getBookingDepartureEndIso(booking);
}

export function isBookingDepartureSnapshotStale(booking: BookingDepartureDisplayInput): boolean {
  return isBookingScheduleSuperseded(booking);
}
