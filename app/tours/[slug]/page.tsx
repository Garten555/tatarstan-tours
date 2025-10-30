import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  DollarSign,
  ArrowLeft,
  Share2
} from 'lucide-react';

interface TourPageProps {
  params: Promise<{ slug: string }>;
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

export default async function TourPage({ params }: TourPageProps) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  // Получаем данные тура
  const { data: tour, error } = await supabase
    .from('tours')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (error || !tour) {
    notFound();
  }

  // Получаем медиа галерею
  const { data: media } = await supabase
    .from('tour_media')
    .select('*')
    .eq('tour_id', tour.id)
    .order('created_at', { ascending: true });

  const photos = media?.filter((m) => m.media_type === 'photo') || [];
  const videos = media?.filter((m) => m.media_type === 'video') || [];

  const availableSpots = tour.max_participants - (tour.current_participants || 0);
  const isFullyBooked = availableSpots <= 0;

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Вычисляем продолжительность
  const getDuration = () => {
    const start = new Date(tour.start_date);
    const end = new Date(tour.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      return `${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`;
    }
    
    return `${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Назад на главную</span>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Левая колонка - основная информация */}
          <div className="lg:col-span-2 space-y-8">
            {/* Обложка */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="relative h-96">
                <Image
                  src={tour.cover_image}
                  alt={tour.title}
                  fill
                  className="object-cover"
                  priority
                />
                
                {/* Бейджи */}
                <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                  <span className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-full">
                    {TOUR_TYPE_LABELS[tour.tour_type] || tour.tour_type}
                  </span>
                  <span className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-full">
                    {CATEGORY_LABELS[tour.category] || tour.category}
                  </span>
                </div>
              </div>

              <div className="p-8">
                {/* Заголовок */}
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {tour.title}
                </h1>

                {/* Краткое описание */}
                <p className="text-lg text-gray-600 mb-6">
                  {tour.short_desc}
                </p>

                {/* Метаданные */}
                <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-emerald-500" />
                    <div>
                      <div className="text-sm text-gray-500">Начало</div>
                      <div className="font-medium text-gray-900">
                        {formatDate(tour.start_date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-emerald-500" />
                    <div>
                      <div className="text-sm text-gray-500">Продолжительность</div>
                      <div className="font-medium text-gray-900">{getDuration()}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-emerald-500" />
                    <div>
                      <div className="text-sm text-gray-500">Участники</div>
                      <div className="font-medium text-gray-900">
                        До {tour.max_participants} человек
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-emerald-500" />
                    <div>
                      <div className="text-sm text-gray-500">Цена</div>
                      <div className="font-medium text-gray-900">
                        {tour.price_per_person.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  </div>
                </div>

                {/* Полное описание */}
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Описание тура
                  </h2>
                  <div
                    className="prose prose-lg max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: tour.full_desc }}
                  />
                </div>
              </div>
            </div>

            {/* Галерея */}
            {photos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Фотогалерея
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative h-48 rounded-xl overflow-hidden"
                    >
                      <Image
                        src={photo.media_url}
                        alt={photo.file_name}
                        fill
                        className="object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Видео */}
            {videos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Видео о туре
                </h2>
                <div className="space-y-4">
                  {videos.map((video) => (
                    <video
                      key={video.id}
                      controls
                      className="w-full rounded-xl"
                    >
                      <source src={video.media_url} type={video.mime_type} />
                      Ваш браузер не поддерживает видео.
                    </video>
                  ))}
                </div>
              </div>
            )}

            {/* Яндекс Карта */}
            {tour.yandex_map_url && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-emerald-500" />
                  Место проведения
                </h2>
                <div className="relative w-full h-96 rounded-xl overflow-hidden">
                  {tour.yandex_map_url.includes('<iframe') ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: tour.yandex_map_url }}
                      className="w-full h-full"
                    />
                  ) : (
                    <iframe
                      src={tour.yandex_map_url}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка - бронирование */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <div className="mb-6">
                <div className="text-3xl font-bold text-emerald-600 mb-2">
                  {tour.price_per_person.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-sm text-gray-500">за человека</div>
              </div>

              {/* Доступность мест */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Доступно мест:</span>
                  <span className="font-bold text-gray-900">
                    {availableSpots} / {tour.max_participants}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${(availableSpots / tour.max_participants) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Кнопка бронирования */}
              <button
                className={`w-full py-4 rounded-xl font-bold text-lg mb-4 transition-all ${
                  isFullyBooked
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-xl'
                }`}
                disabled={isFullyBooked}
              >
                {isFullyBooked ? 'Мест нет' : 'Забронировать'}
              </button>

              {/* Информация */}
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>Бесплатная отмена за 24 часа</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>Подтверждение в течение 1 часа</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500">✓</span>
                  <span>Опытный гид-экскурсовод</span>
                </div>
              </div>

              {/* Кнопка "Поделиться" */}
              <button className="w-full mt-6 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
                Поделиться
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
