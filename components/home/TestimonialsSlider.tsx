'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { ReviewTourContext } from '@/components/reviews/ReviewTourContext';

export type TestimonialItem = {
  id: string;
  text: string;
  rating: number;
  userName: string;
  avatarUrl: string | null;
  initials: string;
  tour: {
    title: string;
    slug?: string | null;
    status?: string | null;
    end_date?: string | null;
    start_date?: string | null;
  } | null;
};

const PAGE_SIZE = 3;

function getRatingColor(rating: number) {
  if (rating >= 4.5) return 'text-emerald-600';
  if (rating >= 3.5) return 'text-lime-600';
  if (rating >= 2.5) return 'text-amber-500';
  return 'text-rose-500';
}

export function TestimonialsSlider({ items }: { items: TestimonialItem[] }) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const [page, setPage] = useState(0);

  const visible = useMemo(() => {
    const start = page * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const goPrev = () => setPage((p) => (p <= 0 ? pageCount - 1 : p - 1));
  const goNext = () => setPage((p) => (p >= pageCount - 1 ? 0 : p + 1));

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visible.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl bg-white border-2 border-gray-100 p-6 md:p-8 shadow-sm transition-all duration-300 min-h-[220px]"
          >
            <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Quote className="w-12 h-12 text-emerald-600" />
            </div>

            {item.tour?.title ? (
              <div className="mb-4 relative z-10">
                <ReviewTourContext tour={item.tour} showLink={false} />
              </div>
            ) : null}

            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6 relative z-10">
              &ldquo;{item.text}&rdquo;
            </p>

            <div className="flex items-center gap-4 relative z-10">
              {item.avatarUrl ? (
                <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-emerald-100 flex-shrink-0">
                  <Image
                    src={item.avatarUrl}
                    alt={item.userName}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-sm font-bold border-2 border-emerald-100 flex-shrink-0">
                  {item.initials}
                </div>
              )}
              <div className="flex-1">
                <div className="text-base md:text-lg font-bold text-gray-900">{item.userName}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const isActive = item.rating >= value;
                      return (
                        <Star
                          key={value}
                          className={
                            isActive
                              ? `h-4 w-4 ${getRatingColor(item.rating)} fill-current`
                              : 'h-4 w-4 text-gray-200'
                          }
                        />
                      );
                    })}
                  </div>
                  <span className={`text-sm font-bold ${getRatingColor(item.rating)}`}>
                    {item.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            aria-label="Предыдущие отзывы"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === page ? 'w-8 bg-emerald-600' : 'w-2.5 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Страница ${i + 1}`}
                aria-current={i === page ? 'true' : undefined}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-gray-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            aria-label="Следующие отзывы"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
