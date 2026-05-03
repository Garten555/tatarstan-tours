'use client';

import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import TourCard from './TourCard';
import { Search, SlidersHorizontal } from 'lucide-react';

/** Демо-данные в формате TourCard + поля для фильтров (позже — Supabase). */
type MockTour = {
  id: string;
  slug: string;
  title: string;
  short_desc: string;
  cover_image: string;
  price_per_person: number;
  start_date: string;
  end_date: string;
  max_participants: number;
  current_participants: number;
  tour_type: string;
  category: string;
  /** Примерная длительность экскурсии в часах (один день — часы в программе). */
  hoursApprox: number;
  locationLabel: string;
};

const MOCK_TOURS: MockTour[] = [
  {
    id: '1',
    slug: 'kazan-city-tour',
    title: 'Обзорная экскурсия по Казани',
    short_desc:
      'Познакомьтесь с главными достопримечательностями столицы Татарстана: Казанский Кремль, мечеть Кул-Шариф, улица Баумана и многое другое.',
    price_per_person: 2500,
    cover_image:
      'https://images.unsplash.com/photo-1585009414034-8e689de58c29?w=1200&h=800&fit=crop',
    locationLabel: 'Казань',
    max_participants: 25,
    current_participants: 10,
    start_date: '2026-06-01',
    end_date: '2026-06-01',
    tour_type: 'excursion',
    category: 'history',
    hoursApprox: 5,
  },
  {
    id: '2',
    slug: 'sviyazhsk-island',
    title: 'Остров-град Свияжск',
    short_desc:
      'Уникальный остров-музей с богатой историей. Посетите Успенский монастырь, храмы и музеи древнего города.',
    price_per_person: 3200,
    cover_image:
      'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1200&h=800&fit=crop',
    locationLabel: 'Свияжск',
    max_participants: 20,
    current_participants: 6,
    start_date: '2026-06-15',
    end_date: '2026-06-15',
    tour_type: 'excursion',
    category: 'architecture',
    hoursApprox: 7,
  },
  {
    id: '3',
    slug: 'bulgar-ancient-city',
    title: 'Древний Булгар',
    short_desc:
      'Путешествие в столицу Волжской Булгарии — объект всемирного наследия ЮНЕСКО.',
    price_per_person: 3800,
    cover_image:
      'https://images.unsplash.com/photo-1564769610726-39f5c0a10e6f?w=1200&h=800&fit=crop',
    locationLabel: 'Болгар',
    max_participants: 30,
    current_participants: 12,
    start_date: '2026-07-03',
    end_date: '2026-07-03',
    tour_type: 'bus_tour',
    category: 'history',
    hoursApprox: 9,
  },
  {
    id: '4',
    slug: 'elabuga-heritage',
    title: 'Елабуга: город-музей',
    short_desc:
      'Купеческая Елабуга — родина Ивана Шишкина и Марины Цветаевой.',
    price_per_person: 4200,
    cover_image:
      'https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=1200&h=800&fit=crop',
    locationLabel: 'Елабуга',
    max_participants: 15,
    current_participants: 15,
    start_date: '2026-08-10',
    end_date: '2026-08-10',
    tour_type: 'walking_tour',
    category: 'culture',
    hoursApprox: 11,
  },
  {
    id: '5',
    slug: 'raifa-monastery',
    title: 'Раифский монастырь',
    short_desc:
      'Духовный центр Татарстана в окружении леса. Чудотворная икона Грузинской Божией Матери.',
    price_per_person: 2800,
    cover_image:
      'https://images.unsplash.com/photo-1605026582871-d3c2e17b5dff?w=1200&h=800&fit=crop',
    locationLabel: 'Раифа',
    max_participants: 25,
    current_participants: 8,
    start_date: '2026-05-22',
    end_date: '2026-05-22',
    tour_type: 'excursion',
    category: 'culture',
    hoursApprox: 6,
  },
  {
    id: '6',
    slug: 'temple-of-all-religions',
    title: 'Храм всех религий',
    short_desc:
      'Уникальный архитектурный ансамбль — символы мировых религий. Экскурсия с гидом.',
    price_per_person: 1800,
    cover_image:
      'https://images.unsplash.com/photo-1564769610726-39f5c0a10e6f?w=1200&h=800&fit=crop',
    locationLabel: 'Казань',
    max_participants: 30,
    current_participants: 5,
    start_date: '2026-09-01',
    end_date: '2026-09-01',
    tour_type: 'walking_tour',
    category: 'architecture',
    hoursApprox: 3,
  },
];

function toTourCardProps(t: MockTour): ComponentProps<typeof TourCard> {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    short_desc: t.short_desc,
    cover_image: t.cover_image,
    price_per_person: t.price_per_person,
    start_date: t.start_date,
    end_date: t.end_date,
    max_participants: t.max_participants,
    current_participants: t.current_participants,
    tour_type: t.tour_type,
    category: t.category,
  };
}

function parseOptionalInt(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export default function TourGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [durationPreset, setDurationPreset] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [maxParticipantsMin, setMaxParticipantsMin] = useState('');
  const [startDateFrom, setStartDateFrom] = useState('');

  const resetFilters = () => {
    setSearchQuery('');
    setPriceMin('');
    setPriceMax('');
    setDurationPreset('all');
    setMaxParticipantsMin('');
    setStartDateFrom('');
  };

  const filteredTours = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const pMin = parseOptionalInt(priceMin);
    const pMax = parseOptionalInt(priceMax);
    const capMin = parseOptionalInt(maxParticipantsMin);
    const startFrom = startDateFrom.trim() ? new Date(startDateFrom) : null;
    if (startFrom) startFrom.setHours(0, 0, 0, 0);

    return MOCK_TOURS.filter((tour) => {
      if (q) {
        const blob = `${tour.title} ${tour.short_desc} ${tour.locationLabel}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }

      if (pMin !== null && tour.price_per_person < pMin) return false;
      if (pMax !== null && tour.price_per_person > pMax) return false;

      if (durationPreset !== 'all') {
        const h = tour.hoursApprox;
        if (durationPreset === 'short' && h > 4) return false;
        if (durationPreset === 'medium' && (h <= 4 || h > 8)) return false;
        if (durationPreset === 'long' && h <= 8) return false;
      }

      if (capMin !== null && tour.max_participants < capMin) return false;

      if (startFrom) {
        const sd = new Date(tour.start_date);
        sd.setHours(0, 0, 0, 0);
        if (sd < startFrom) return false;
      }

      return true;
    });
  }, [searchQuery, priceMin, priceMax, durationPreset, maxParticipantsMin, startDateFrom]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(priceMin.trim()) ||
    Boolean(priceMax.trim()) ||
    durationPreset !== 'all' ||
    Boolean(maxParticipantsMin.trim()) ||
    Boolean(startDateFrom.trim());

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
          <input
            type="search"
            placeholder="Поиск туров по названию, описанию, месту…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-3 pl-12 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 rounded-lg border px-6 py-3 transition-colors ${
            showFilters ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          Фильтры
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">Подбор тура</h3>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Сбросить всё
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Цена от, ₽</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="не важно"
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Цена до, ₽</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="не важно"
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Дата старта не раньше</span>
              <input
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-gray-700">Размер группы от (мест в туре)</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={maxParticipantsMin}
                onChange={(e) => setMaxParticipantsMin(e.target.value)}
                placeholder="например 20"
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <div className="flex flex-col gap-2 text-sm sm:col-span-2 lg:col-span-2">
              <span className="font-semibold text-gray-700">Длительность экскурсии (часы)</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'all' as const, label: 'Любая' },
                    { id: 'short' as const, label: 'До 4 ч' },
                    { id: 'medium' as const, label: '4–8 ч' },
                    { id: 'long' as const, label: 'Свыше 8 ч' },
                  ]
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDurationPreset(id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      durationPreset === id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="text-gray-600">
          Найдено туров:{' '}
          <span className="font-semibold tabular-nums">{filteredTours.length}</span>
        </div>
      )}

      {filteredTours.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredTours.map((tour) => (
            <div key={tour.id} className="min-w-0">
              <TourCard {...toTourCardProps(tour)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="mb-4 text-2xl text-gray-600">Туры не найдены</p>
          <p className="text-gray-500">
            Попробуйте изменить запрос или{' '}
            <button type="button" onClick={resetFilters} className="text-emerald-600 underline hover:text-emerald-700">
              сбросить фильтры
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
