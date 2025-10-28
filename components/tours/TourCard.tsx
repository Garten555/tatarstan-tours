import Link from 'next/link';
import Image from 'next/image';
import { Clock, MapPin, Users, Calendar } from 'lucide-react';

interface TourCardProps {
  slug: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  location: string;
  maxParticipants: number;
  availableDates: number;
}

export default function TourCard({
  slug,
  title,
  description,
  price,
  duration,
  image,
  location,
  maxParticipants,
  availableDates,
}: TourCardProps) {
  return (
    <Link href={`/tours/${slug}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer h-full flex flex-col">
        {/* Изображение тура */}
        <div className="relative h-64 overflow-hidden">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {/* Бейдж с ценой */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
            <span className="text-2xl font-bold text-emerald-600">
              {price.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          {/* Бейдж доступности */}
          {availableDates > 0 && (
            <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Доступно дат: {availableDates}
            </div>
          )}
        </div>

        {/* Контент карточки */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Заголовок */}
          <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">
            {title}
          </h3>

          {/* Описание */}
          <p className="text-gray-600 mb-4 line-clamp-2 flex-1">
            {description}
          </p>

          {/* Информация о туре */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center text-gray-600">
              <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
              <span className="text-sm">{location}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="w-5 h-5 mr-2 text-emerald-600" />
              <span className="text-sm">{duration}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Users className="w-5 h-5 mr-2 text-emerald-600" />
              <span className="text-sm">До {maxParticipants} человек</span>
            </div>
          </div>

          {/* Кнопка */}
          <button className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" />
            Забронировать
          </button>
        </div>
      </div>
    </Link>
  );
}

