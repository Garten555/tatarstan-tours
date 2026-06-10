import type { BookingForReview } from '@/lib/bookings/review-eligibility';

export type BookingTourLinkInput = BookingForReview & {
  id: string;
  schedule_superseded_at?: string | null;
  tour?: { slug: string } | null;
};

/** Ссылка на страницу тура в контексте конкретной брони (своя дата, свой участник). */
export function getTourPageHrefForBooking(booking: BookingTourLinkInput): string {
  const slug = booking.tour?.slug;
  if (!slug) return '/tours';
  return `/tours/${slug}?booking=${booking.id}`;
}
