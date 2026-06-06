'use client';

import { MapPin } from 'lucide-react';
import Link from 'next/link';

import { isTourPageLinkable } from '@/lib/tours/tour-public-visibility';

type ReviewTourContextProps = {
  tour: {
    title: string;
    slug?: string | null;
    status?: string | null;
    end_date?: string | null;
    start_date?: string | null;
  };
  className?: string;
};

/** Название тура под отзывом: ссылка только если страница тура доступна. */
export function ReviewTourContext({ tour, className = '' }: ReviewTourContextProps) {
  const linkable = isTourPageLinkable(tour);

  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      {linkable ? (
        <Link
          href={`/tours/${tour.slug}`}
          className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          {tour.title}
        </Link>
      ) : (
        <span className="font-semibold text-gray-700">{tour.title}</span>
      )}
      {!linkable ? (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          тур завершён
        </span>
      ) : null}
    </div>
  );
}
