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
  /** На главной — только текст, без ссылки */
  showLink?: boolean;
};

/** Название тура под отзывом: ссылка только если страница тура доступна и showLink. */
export function ReviewTourContext({
  tour,
  className = '',
  showLink = true,
}: ReviewTourContextProps) {
  const linkable = showLink && isTourPageLinkable(tour);

  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      {linkable ? (
        <Link
          href={`/tours/${tour.slug}`}
          className="font-medium text-gray-700 hover:text-emerald-700 hover:underline no-underline"
        >
          {tour.title}
        </Link>
      ) : (
        <span className="font-medium text-gray-600">{tour.title}</span>
      )}
      {!linkable ? (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
          тур завершён
        </span>
      ) : null}
    </div>
  );
}
