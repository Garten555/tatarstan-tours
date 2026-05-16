'use client';

import { useEffect, useState } from 'react';

function pluralTours(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'тур';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'тура';
  return 'туров';
}

export function FeaturedToursCountBadge({ initialCount }: { initialCount: number }) {
  const [total, setTotal] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/tours/filter?limit=1&page=1', {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!cancelled && typeof data.total === 'number') {
          setTotal(data.total);
        }
      } catch {
        /* оставляем initialCount */
      }
    };

    void load();
    const id = window.setInterval(load, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-emerald-200/50 shadow-sm">
      <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
      <span className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 font-bold">
        Доступно {total} {pluralTours(total)}
      </span>
    </div>
  );
}
