'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getToursCatalogBackHref } from '@/lib/tours/catalog-navigation';

export default function TourCatalogBackLink() {
  const [href, setHref] = useState('/tours#tours-catalog');

  useEffect(() => {
    setHref(getToursCatalogBackHref('/tours#tours-catalog'));
  }, []);

  return (
    <Link
      href={href}
      className="group relative z-10 inline-flex items-center gap-2 sm:gap-3 text-gray-900 hover:text-emerald-600 transition-all duration-200 mb-6 sm:mb-8 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md shadow-md hover:shadow-lg border-2 border-gray-200 hover:border-emerald-300 hover:bg-white"
    >
      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-200 flex-shrink-0" />
      <span className="font-bold text-sm sm:text-base">Назад к турам</span>
    </Link>
  );
}
