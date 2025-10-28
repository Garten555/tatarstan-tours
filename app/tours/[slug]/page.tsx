import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin, Users, Calendar, Star, Shield, Camera, Heart } from 'lucide-react';

// Типы для props (Next.js 16 - params теперь Promise)
interface TourPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Временные данные туров (потом заменим на Supabase)
const TOURS_DATA: Record<string, any> = {
  'kazan-city-tour': {
    title: 'Обзорная экскурсия по Казани',
    description: 'Познакомьтесь с главными достопримечательностями столицы Татарстана: Казанский Кремль, мечеть Кул-Шариф, улица Баумана и многое другое.',
    fullDescription: `Казань - это уникальный город, где гармонично сочетаются европейская и восточная культуры. 
    
    На этой экскурсии вы увидите:
    - Казанский Кремль (объект ЮНЕСКО)
    - Мечеть Кул-Шариф - символ города
    - Благовещенский собор
    - Башню Сююмбике
    - Пешеходную улицу Баумана
    - Площадь Тысячелетия
    
    Профессиональный гид расскажет об истории города, его легендах и современной жизни. Вы узнаете о традициях татарского народа, попробуете национальную кухню и сделаете незабываемые фотографии.`,
    price: 2500,
    duration: '4-5 часов',
    image: 'https://images.unsplash.com/photo-1585009414034-8e689de58c29?w=1200&h=800&fit=crop', // Placeholder (реальные фото будут из S3)
    location: 'Казань',
    maxParticipants: 25,
    rating: 4.9,
    reviewsCount: 237,
    includes: [
      'Профессиональный гид',
      'Входные билеты в музеи',
      'Транспорт по программе',
      'Бутилированная вода',
    ],
    notIncludes: [
      'Личные расходы',
      'Обед (можно заказать отдельно)',
      'Страховка',
    ],
    schedule: [
      { time: '10:00', activity: 'Встреча группы у гостиницы' },
      { time: '10:30', activity: 'Экскурсия по Казанскому Кремлю' },
      { time: '12:30', activity: 'Посещение мечети Кул-Шариф' },
      { time: '13:30', activity: 'Обед (опционально)' },
      { time: '14:30', activity: 'Прогулка по улице Баумана' },
      { time: '15:30', activity: 'Завершение тура' },
    ],
    availableDates: [
      '2024-11-15',
      '2024-11-22',
      '2024-11-29',
      '2024-12-06',
      '2024-12-13',
    ],
  },
  // Можно добавить больше туров по аналогии
};

// Генерация метаданных для SEO
export async function generateMetadata({ params }: TourPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tour = TOURS_DATA[slug];
  
  if (!tour) {
    return {
      title: 'Тур не найден',
    };
  }

  return {
    title: `${tour.title} | Tatarstan Tours`,
    description: tour.description,
    openGraph: {
      title: tour.title,
      description: tour.description,
      images: [tour.image],
    },
  };
}

export default async function TourPage({ params }: TourPageProps) {
  const { slug } = await params;
  const tour = TOURS_DATA[slug];

  // Если тур не найден - 404
  if (!tour) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero изображение */}
      <div className="relative h-[60vh] w-full">
        <Image
          src={tour.image}
          alt={tour.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Заголовок поверх изображения */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-white" />
              <span className="text-white/90">{tour.location}</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">{tour.title}</h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{tour.rating}</span>
                <span className="text-sm">({tour.reviewsCount} отзывов)</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-5 h-5" />
                <span>{tour.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-5 h-5" />
                <span>До {tour.maxParticipants} человек</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая колонка - описание */}
          <div className="lg:col-span-2 space-y-8">
            {/* Описание */}
            <section className="bg-white p-8 rounded-xl shadow-sm">
              <h2 className="text-3xl font-bold mb-6">О туре</h2>
              <div className="prose prose-lg max-w-none text-gray-600 whitespace-pre-line">
                {tour.fullDescription}
              </div>
            </section>

            {/* Что входит */}
            <section className="bg-white p-8 rounded-xl shadow-sm">
              <h2 className="text-3xl font-bold mb-6">Что входит в стоимость</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-emerald-600 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Включено
                  </h3>
                  <ul className="space-y-2">
                    {tour.includes.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <span className="text-emerald-600 mt-1">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-600 mb-4">Не включено</h3>
                  <ul className="space-y-2">
                    {tour.notIncludes.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-gray-600">
                        <span className="text-gray-400 mt-1">×</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Программа тура */}
            <section className="bg-white p-8 rounded-xl shadow-sm">
              <h2 className="text-3xl font-bold mb-6">Программа тура</h2>
              <div className="space-y-4">
                {tour.schedule.map((item: any, i: number) => (
                  <div key={i} className="flex gap-4 border-l-4 border-emerald-600 pl-4 py-2">
                    <div className="font-semibold text-emerald-600 min-w-[80px]">
                      {item.time}
                    </div>
                    <div className="text-gray-600">{item.activity}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Правая колонка - бронирование */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-xl shadow-lg sticky top-24">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-emerald-600 mb-2">
                  {tour.price.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-gray-600">за человека</div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Длительность</span>
                  <span className="font-semibold">{tour.duration}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Группа</span>
                  <span className="font-semibold">До {tour.maxParticipants} чел.</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Доступно дат</span>
                  <span className="font-semibold text-emerald-600">
                    {tour.availableDates.length}
                  </span>
                </div>
              </div>

              <Link href="/booking">
                <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mb-4">
                  <Calendar className="w-5 h-5" />
                  Забронировать тур
                </button>
              </Link>

              <button className="w-full border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" />
                В избранное
              </button>

              <div className="mt-6 pt-6 border-t space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Гарантия лучшей цены</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Бесплатная отмена за 24 часа</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Фотосъемка включена</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

