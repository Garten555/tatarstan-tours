'use client';

import { useState } from 'react';
import TourCard from './TourCard';
import { Search, SlidersHorizontal } from 'lucide-react';

// Временные данные туров (потом заменим на данные из Supabase)
// NOTE: image URL будут из S3 хранилища после загрузки через админку
const MOCK_TOURS = [
  {
    id: 1,
    slug: 'kazan-city-tour',
    title: 'Обзорная экскурсия по Казани',
    description: 'Познакомьтесь с главными достопримечательностями столицы Татарстана: Казанский Кремль, мечеть Кул-Шариф, улица Баумана и многое другое.',
    price: 2500,
    duration: '4-5 часов',
    image: 'https://images.unsplash.com/photo-1585009414034-8e689de58c29?w=1200&h=800&fit=crop', // Placeholder из Unsplash
    location: 'Казань',
    maxParticipants: 25,
    availableDates: 12,
  },
  {
    id: 2,
    slug: 'sviyazhsk-island',
    title: 'Остров-град Свияжск',
    description: 'Уникальный остров-музей с богатой историей. Посетите Успенский монастырь, храмы и музеи древнего города.',
    price: 3200,
    duration: '6-7 часов',
    image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1200&h=800&fit=crop', // Placeholder
    location: 'Свияжск',
    maxParticipants: 20,
    availableDates: 8,
  },
  {
    id: 3,
    slug: 'bulgar-ancient-city',
    title: 'Древний Булгар',
    description: 'Путешествие в столицу Волжской Булгарии - объект всемирного наследия ЮНЕСКО. Мечеть, музеи, археологические раскопки.',
    price: 3800,
    duration: '8-9 часов',
    image: 'https://images.unsplash.com/photo-1564769610726-39f5c0a10e6f?w=1200&h=800&fit=crop', // Placeholder
    location: 'Болгар',
    maxParticipants: 30,
    availableDates: 6,
  },
  {
    id: 4,
    slug: 'elabuga-heritage',
    title: 'Елабуга: город-музей',
    description: 'Откройте для себя купеческую Елабугу - родину Ивана Шишкина и Марины Цветаевой. Прогулка по старинным улочкам.',
    price: 4200,
    duration: '10-11 часов',
    image: 'https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=1200&h=800&fit=crop', // Placeholder
    location: 'Елабуга',
    maxParticipants: 15,
    availableDates: 5,
  },
  {
    id: 5,
    slug: 'raifa-monastery',
    title: 'Раифский монастырь',
    description: 'Духовный центр Татарстана в окружении живописного леса. Чудотворная икона Грузинской Божией Матери.',
    price: 2800,
    duration: '5-6 часов',
    image: 'https://images.unsplash.com/photo-1605026582871-d3c2e17b5dff?w=1200&h=800&fit=crop', // Placeholder
    location: 'Раифа',
    maxParticipants: 25,
    availableDates: 10,
  },
  {
    id: 6,
    slug: 'temple-of-all-religions',
    title: 'Храм всех религий',
    description: 'Уникальный архитектурный ансамбль, объединяющий символы 16 мировых религий. Экскурсия с гидом.',
    price: 1800,
    duration: '2-3 часа',
    image: 'https://images.unsplash.com/photo-1564769610726-39f5c0a10e6f?w=1200&h=800&fit=crop', // Placeholder
    location: 'Казань',
    maxParticipants: 30,
    availableDates: 15,
  },
];

export default function TourGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Фильтрация туров по поисковому запросу
  const filteredTours = MOCK_TOURS.filter(
    (tour) =>
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Поиск и фильтры */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Поисковая строка */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск туров по названию, месту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Кнопка фильтров */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Фильтры
        </button>
      </div>

      {/* Панель фильтров (пока заглушка) */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-gray-600">
            🚧 Фильтры в разработке (цена, длительность, дата, количество участников)
          </p>
        </div>
      )}

      {/* Результаты поиска */}
      {searchQuery && (
        <div className="text-gray-600">
          Найдено туров: <span className="font-semibold">{filteredTours.length}</span>
        </div>
      )}

      {/* Сетка туров */}
      {filteredTours.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTours.map((tour) => (
            <TourCard key={tour.id} {...(tour as any)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-2xl text-gray-600 mb-4">
            Туры не найдены 😔
          </p>
          <p className="text-gray-500">
            Попробуйте изменить запрос или{' '}
            <button
              onClick={() => setSearchQuery('')}
              className="text-emerald-600 hover:text-emerald-700 underline"
            >
              сбросить фильтры
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

