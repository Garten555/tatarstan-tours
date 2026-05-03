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
    <Link href={`/tours/${slug}`} prefetch={true} className="group">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col min-w-0">
        {/* Изображение */}
        <div className="relative h-48 sm:h-56 md:h-60 overflow-hidden min-w-0">
          <Image
            src={cover_image}
            alt={titleSingleLine}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          {/* Статус бронирования */}
          {isFullyBooked && (
            <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4">
              <span className="px-2 py-1 sm:px-2.5 sm:py-1 md:px-3 md:py-1.5 bg-red-500 text-white text-xs sm:text-sm font-bold rounded-full shadow-sm">
                Мест нет
              </span>
            </div>
          )}

          {/* Название: фикс. размер шрифта + «полка» 2 строки — при масштабе не появляется «лишний» текст */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-5 min-w-0">
            <div className="max-h-[2.8125rem] min-h-[2.8125rem] overflow-hidden">
              <ClampedText
                as="h3"
                lines={2}
                className="text-lg font-black leading-tight text-white drop-shadow-lg"
              >
                {titleSingleLine}
              </ClampedText>
            </div>
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

          {/* Описание: без flex-1 и без скачков text-sm/md:lg — ровно 2 строки в фиксированной высоте */}
          <div className="mb-3 min-h-[2.84375rem] max-h-[2.84375rem] overflow-hidden sm:mb-4 md:mb-5">
            <ClampedText lines={2} className="text-sm leading-relaxed text-gray-600">
              {descSingleLine}
            </ClampedText>
          </div>

          {/* Метаданные */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-5">
            {/* Даты */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 bg-gray-50 rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{formatDate(start_date)}</span>
            </div>

            {/* Продолжительность */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 bg-gray-50 rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 font-medium">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{getDuration()}</span>
            </div>

            {/* Участники */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 bg-gray-50 rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 col-span-2 font-medium">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">
                {availableSpots > 0 
                  ? `Осталось ${availableSpots} ${availableSpots === 1 ? 'место' : availableSpots < 5 ? 'места' : 'мест'}`
                  : 'Мест нет'
                }
              </span>
            </div>
          </div>

          {/* Цена и кнопка */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-3 sm:pt-4 md:pt-5 border-t-2 border-gray-100">
            <div className="w-full sm:w-auto">
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-700">
                {price_per_person.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs sm:text-sm md:text-base text-gray-600 font-medium mt-0.5 sm:mt-1">за человека</div>
            </div>
            
            <button
              className={`w-full sm:w-auto px-4 sm:px-5 md:px-6 lg:px-8 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold transition-all ${
                isFullyBooked
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl hover:scale-105'
              }`}
              disabled={isFullyBooked}
            >
              {isFullyBooked ? 'Недоступно' : 'Подробнее'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
