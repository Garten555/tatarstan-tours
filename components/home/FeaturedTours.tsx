'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

import type { DisplayableCatalogTourRow } from '@/lib/tours/active-catalog-listing';
import TourCard from '@/components/tours/TourCard';
import { FeaturedToursCountBadge } from '@/components/home/FeaturedToursCountBadge';
import { usePublicCatalogRefresh } from '@/lib/hooks/use-public-catalog-refresh';

type FeaturedToursProps = {
  tours: DisplayableCatalogTourRow[];
  totalAvailableTours: number;
};

export function FeaturedTours({ tours: initialTours, totalAvailableTours: initialTotal }: FeaturedToursProps) {
  const [tours, setTours] = useState(initialTours);
  const [totalAvailableTours, setTotalAvailableTours] = useState(initialTotal);
  const [nextVisibilityChangeAt, setNextVisibilityChangeAt] = useState<string | null>(null);

  useEffect(() => {
    setTours(initialTours);
    setTotalAvailableTours(initialTotal);
  }, [initialTours, initialTotal]);

  const refetchFeatured = useCallback(async () => {
    try {
      const res = await fetch('/api/tours/home-featured', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        tours?: DisplayableCatalogTourRow[];
        totalAvailableTours?: number;
        nextVisibilityChangeAt?: string | null;
      };
      setTours(data.tours ?? []);
      setTotalAvailableTours(data.totalAvailableTours ?? 0);
      setNextVisibilityChangeAt(data.nextVisibilityChangeAt ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  const watchStartDates = useMemo(
    () => tours.map((tour) => tour.start_date),
    [tours]
  );

  usePublicCatalogRefresh(refetchFeatured, watchStartDates, nextVisibilityChangeAt);

  if (tours.length === 0) {
    return (
      <section className="py-16 md:py-20 relative overflow-hidden bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-semibold mb-6">
            Скоро запуск
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            Туры скоро появятся
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto font-medium">
            Мы работаем над созданием уникальных маршрутов по Татарстану
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative overflow-hidden bg-white">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-sky-100/40 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6 mb-8 sm:mb-10 md:mb-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-white border border-emerald-200/50 px-3 py-1.5 sm:px-4 sm:py-2 mb-3 sm:mb-4 md:mb-5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span className="text-emerald-700 text-xs sm:text-sm font-semibold">Подборка недели</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-3 sm:mb-4">
              Популярные туры
            </h2>

            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed">
              Самые востребованные маршруты по Татарстану с актуальными датами
            </p>
          </div>

          <FeaturedToursCountBadge count={totalAvailableTours} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10 md:mb-12">
          {tours.map((tour) => (
            <div key={tour.id} className="min-w-0">
              <TourCard
                id={tour.id}
                title={tour.title}
                slug={tour.slug}
                short_desc={tour.short_desc || ''}
                cover_image={tour.cover_image}
                price_per_person={Number(tour.price_per_person)}
                start_date={tour.start_date || ''}
                end_date={tour.end_date || tour.start_date || ''}
                max_participants={tour.max_participants}
                current_participants={tour.current_participants || 0}
                tour_type={tour.tour_type}
                category={tour.category}
              />
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/tours"
            className="group inline-flex items-center gap-2 sm:gap-3 px-6 py-3 sm:px-8 sm:py-4 bg-emerald-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold hover:bg-emerald-700 hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Смотреть все туры
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
