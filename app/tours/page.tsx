export const revalidate = 60
import { createServiceClient } from '@/lib/supabase/server';
import TourCard from '@/components/tours/TourCard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ToursPage() {
  const supabase = await createServiceClient();

  // Получаем все активные туры
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tours:', error);
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Ошибка загрузки туров
          </h1>
          <Link
            href="/"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Вернуться на главную
          </Link>
        </div>
      </main>
    );
  }

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

      {/* Заголовок */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Все туры
          </h1>
          <p className="text-lg text-emerald-50 max-w-2xl mx-auto">
            Выберите идеальное путешествие по Татарстану
          </p>
          <div className="mt-6 text-2xl font-semibold">
            {tours?.length || 0} {tours?.length === 1 ? 'тур' : tours?.length && tours.length < 5 ? 'тура' : 'туров'}
          </div>
        </div>
      </div>

      {/* Туры */}
      <div className="container mx-auto px-4 py-12">
        {!tours || tours.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Туры пока не добавлены
            </h2>
            <p className="text-gray-600 mb-8">
              Скоро здесь появятся увлекательные путешествия по Татарстану
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-all"
            >
              Вернуться на главную
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(tours as any[]).map((tour) => (
              <TourCard
                key={tour.id}
                id={tour.id}
                title={tour.title}
                slug={tour.slug}
                short_desc={tour.short_desc}
                cover_image={tour.cover_image}
                price_per_person={tour.price_per_person}
                start_date={tour.start_date}
                end_date={tour.end_date}
                max_participants={tour.max_participants}
                current_participants={tour.current_participants || 0}
                tour_type={tour.tour_type}
                category={tour.category}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
