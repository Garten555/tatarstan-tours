import Image from 'next/image';
import { Calendar, MapPin, ImageIcon } from 'lucide-react';

import { escapeHtml } from '@/lib/utils/sanitize';

type ParticipatedTourCardProps = {
  bookingId: string;
  tour: {
    title: string;
    slug: string;
    cover_image?: string | null;
    start_date?: string | null;
    city?: { name: string } | null;
  };
};

export function ParticipatedTourCard({ tour }: ParticipatedTourCardProps) {
  const dateLabel = tour.start_date
    ? new Date(tour.start_date).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <article
      className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden w-full"
    >
      {tour.cover_image ? (
        <div className="relative h-56 sm:h-72 w-full bg-gray-100">
          <Image
            src={tour.cover_image}
            alt={escapeHtml(tour.title)}
            fill
            className="object-cover object-center"
            loading="lazy"
            unoptimized={tour.cover_image.includes('s3.twcstorage.ru')}
            sizes="(max-width: 768px) 100vw, 768px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 text-white">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/35 backdrop-blur px-3 py-1 text-xs font-medium">
              <ImageIcon className="w-3.5 h-3.5" />
              Поездка
            </span>
            {tour.city?.name ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/35 backdrop-blur px-3 py-1 text-xs font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {escapeHtml(tour.city.name)}
              </span>
            ) : null}
            {dateLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/35 backdrop-blur px-3 py-1 text-xs font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {dateLabel}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-snug mb-4">
          {escapeHtml(tour.title)}
        </h3>

        {!tour.cover_image && (
          <div className="space-y-3">
            {tour.city?.name ? (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{escapeHtml(tour.city.name)}</span>
              </div>
            ) : null}
            {dateLabel ? (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{dateLabel}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
