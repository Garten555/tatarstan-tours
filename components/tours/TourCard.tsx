'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, MapPin, Clock } from 'lucide-react';

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

const TOUR_TYPE_LABELS: Record<string, string> = {
  excursion: 'Экскурсия',
  multi_day: 'Многодневный',
  weekend: 'Выходные',
};

const CATEGORY_LABELS: Record<string, string> = {
  history: 'История',
  nature: 'Природа',
  culture: 'Культура',
  gastronomy: 'Гастрономия',
  active: 'Активный отдых',
  religious: 'Религиозные',
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
    <Link href={`/tours/${slug}`} className="group">
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col">
        {/* Изображение */}
        <div className="relative h-56 overflow-hidden">
          <Image
            src={cover_image}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Бейджи */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
              {TOUR_TYPE_LABELS[tour_type] || tour_type}
            </span>
            <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
              {CATEGORY_LABELS[category] || category}
            </span>
          </div>

          {/* Статус бронирования */}
          {isFullyBooked && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                Мест нет
              </span>
            </div>
          )}
        </div>

        {/* Контент */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Заголовок */}
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
            {title}
          </h3>

          {/* Описание */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
            {short_desc}
          </p>

          {/* Метаданные */}
          <div className="space-y-2 mb-4">
            {/* Даты */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>{formatDate(start_date)}</span>
            </div>

            {/* Продолжительность */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>{getDuration()}</span>
            </div>

            {/* Участники */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>
                {availableSpots > 0 
                  ? `Осталось ${availableSpots} ${availableSpots === 1 ? 'место' : availableSpots < 5 ? 'места' : 'мест'}`
                  : 'Мест нет'
                }
              </span>
            </div>
          </div>

          {/* Цена и кнопка */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {price_per_person.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs text-gray-500">за человека</div>
            </div>
            
            <button
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                isFullyBooked
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-lg'
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
