'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, Clock } from 'lucide-react';
import ClampedText from '@/components/ui/ClampedText';

interface TourCardProps {
  id: string;
  title: string;
  slug: string;
  short_desc: string;
  cover_image: string;
  price_per_person: number;
  start_date: string;
  end_date: string;
  max_participants: number;
  current_participants: number;
  tour_type: string;
  category: string;
}

const TOUR_TYPE_META: Record<string, { label: string; emoji: string }> = {
  excursion: { label: 'Экскурсия', emoji: '🏛️' },
  hiking: { label: 'Пеший тур', emoji: '🥾' },
  cruise: { label: 'Круиз', emoji: '⛴️' },
  bus_tour: { label: 'Автобусный тур', emoji: '🚌' },
  walking_tour: { label: 'Прогулка', emoji: '🚶' },
  multi_day: { label: 'Многодневный', emoji: '🗓️' },
  weekend: { label: 'Выходные', emoji: '🌤️' },
};

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  history: { label: 'История', emoji: '📜' },
  nature: { label: 'Природа', emoji: '🌲' },
  culture: { label: 'Культура', emoji: '🎭' },
  architecture: { label: 'Архитектура', emoji: '🏰' },
  food: { label: 'Гастрономия', emoji: '🍽️' },
  adventure: { label: 'Приключения', emoji: '⛰️' },
};

export default function TourCard({
  id,
  title,
  slug,
  short_desc,
  cover_image,
  price_per_person,
  start_date,
  end_date,
  max_participants,
  current_participants,
  tour_type,
  category,
}: TourCardProps) {
  const availableSpots = max_participants - current_participants;
  const isFullyBooked = availableSpots <= 0;
  const titleSingleLine = title.replace(/\s+/g, ' ').trim();
  const descSingleLine = short_desc.replace(/\s+/g, ' ').trim();

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  };

  // Вычисляем продолжительность
  const getDuration = () => {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return `${diffHours} ч`;
    }
    
    return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
  };

  return (
    <Link href={`/tours/${slug}`} prefetch={true} className="group block h-full min-w-0">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col min-w-0 max-w-full">
        {/* Фото фиксированного соотношения сторон — узкая колонка + фильтры не ломают сетку */}
        <div
          className="relative isolate w-full min-w-0 overflow-hidden bg-gray-100 aspect-[16/10]"
          style={{ aspectRatio: '16 / 10' }}
        >
          <Image
            src={cover_image}
            alt={titleSingleLine}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          {isFullyBooked && (
            <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 z-20">
              <span className="px-2 py-1 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-sm">
                Мест нет
              </span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4 md:p-5">
            <h3 className="text-base font-black leading-snug text-white drop-shadow-md transition-colors duration-300 group-hover:text-emerald-300 [overflow-wrap:anywhere] break-words line-clamp-3 sm:text-lg md:text-xl">
              {titleSingleLine}
            </h3>
          </div>
        </div>

        {/* Контент */}
        <div className="p-4 sm:p-5 md:p-6 lg:p-7 flex-1 flex flex-col min-w-0">
          {/* Бейджи */}
          <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-3 sm:mb-4">
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-100 text-emerald-700 text-xs sm:text-sm font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg leading-none">{TOUR_TYPE_META[tour_type]?.emoji || '🧭'}</span>
              <span>{TOUR_TYPE_META[tour_type]?.label || tour_type}</span>
            </span>
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-100 text-sky-700 text-xs sm:text-sm font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg leading-none">{CATEGORY_META[category]?.emoji || '🧩'}</span>
              <span>{CATEGORY_META[category]?.label || category}</span>
            </span>
          </div>

          {/* Краткое описание — только здесь многоточие; название на обложке полностью */}
          <div className="mb-3 min-h-[4.1rem] overflow-hidden sm:mb-4 sm:min-h-[4.5rem] md:mb-5 md:min-h-[5rem]">
            <ClampedText
              lines={3}
              className="text-sm leading-relaxed text-gray-600 transition-colors duration-300 group-hover:text-emerald-900/90 sm:text-base md:text-lg"
            >
              {descSingleLine}
            </ClampedText>
          </div>

          {/* Метаданные: без truncate — в узкой колонке текст переносится */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-5">
            <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 font-medium min-w-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="min-w-0 leading-snug break-words">{formatDate(start_date)}</span>
            </div>

            <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 font-medium min-w-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="min-w-0 leading-snug break-words">{getDuration()}</span>
            </div>

            <div className="flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg sm:rounded-xl px-2 sm:px-3 py-2 sm:py-2.5 col-span-2 font-medium min-w-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="min-w-0 leading-snug break-words">
                {availableSpots > 0 
                  ? `Осталось ${availableSpots} ${availableSpots === 1 ? 'место' : availableSpots < 5 ? 'места' : 'мест'}`
                  : 'Мест нет'
                }
              </span>
            </div>
          </div>

          {/* Цена и CTA: не режем кнопку у края карточки */}
          <div className="mt-auto flex flex-col gap-3 pt-3 sm:pt-4 border-t-2 border-gray-100 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4">
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-700 tabular-nums">
                {price_per_person.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs sm:text-sm text-gray-600 font-medium mt-0.5">за человека</div>
            </div>

            <span
              className={`inline-flex w-full shrink-0 items-center justify-center px-4 py-2.5 sm:w-auto sm:min-w-[9rem] sm:px-6 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold transition-all pointer-events-none select-none ${
                isFullyBooked
                  ? 'bg-gray-300 text-gray-500'
                  : 'bg-emerald-600 text-white group-hover:bg-emerald-700 group-hover:shadow-lg'
              }`}
              aria-hidden
            >
              {isFullyBooked ? 'Недоступно' : 'Подробнее'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
