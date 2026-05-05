'use client';

import { useRouter, usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import {
  BOOKING_TOUR_REDIRECT_MESSAGES,
  type BookingTourRedirectCode,
} from '@/lib/tour/booking-tour-redirect';

type Props = { code: BookingTourRedirectCode };

export default function TourBookingRedirectBanner({ code }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const message = BOOKING_TOUR_REDIRECT_MESSAGES[code];

  const dismiss = () => {
    router.replace(pathname, { scroll: false });
  };

  return (
    <div
      role="alert"
      className="relative z-10 mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm backdrop-blur-sm sm:text-base"
    >
      <p className="min-w-0 flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Закрыть"
        className="shrink-0 rounded-lg p-1 text-amber-800 transition hover:bg-amber-100 hover:text-amber-950"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
