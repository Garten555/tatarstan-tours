import { createServiceClient } from '@/lib/supabase/server';
import TourCard from '@/components/tours/TourCard';
import Link from 'next/link';

export async function FeaturedTours() {
  const supabase = await createServiceClient();

  // Получаем активные туры
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) {
    console.error('Error fetching tours:', error);
    return null;
  }

  if (!tours || tours.length === 0) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Туры скоро появятся
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Мы работаем над созданием уникальных маршрутов по Татарстану
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Популярные туры
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Откройте для себя уникальные маршруты по Татарстану
          </p>
        </div>

        {/* Сетка туров */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {tours.map((tour) => (
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

        {/* Кнопка "Все туры" */}
        {tours.length > 0 && (
          <div className="text-center">
            <Link
              href="/tours"
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 hover:shadow-lg transition-all"
            >
              Смотреть все туры
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

