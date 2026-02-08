import { createServiceClient } from '@/lib/supabase/server';
import TourCard from '@/components/tours/TourCard';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export async function FeaturedTours() {
  const supabase = createServiceClient();

  const now = new Date().toISOString();
  
  let tours = null;
  let error = null;
  
  try {
    const result = await supabase
      .from('tours')
      .select(`
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
        category
      `)
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(6);
    
    tours = result.data;
    error = result.error;
  } catch (err) {
    console.error('Error fetching tours (catch):', err);
    error = err as any;
  }

  if (error) {
    return (
      <section className="py-16 md:py-20 relative overflow-hidden bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-4 py-2 text-sm font-semibold mb-6">
            Временная ошибка
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            Не удалось загрузить туры
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto font-medium">
            Пожалуйста, попробуйте обновить страницу позже
          </p>
        </div>
      </section>
    );
  }

  if (!tours || tours.length === 0) {
    return (
      <section className="py-16 md:py-20 relative overflow-hidden bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 text-sm font-semibold mb-6">
            Скоро запуск
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
            Туры скоро появятся
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto font-medium">
            Мы работаем над созданием уникальных маршрутов по Татарстану
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative overflow-hidden bg-white">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-sky-100/40 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
        {/* Заголовок */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6 mb-8 sm:mb-10 md:mb-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-white border border-emerald-200/50 px-3 py-1.5 sm:px-4 sm:py-2 mb-3 sm:mb-4 md:mb-5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span className="text-emerald-700 text-xs sm:text-sm font-semibold">Подборка недели</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-3 sm:mb-4">
              Популярные туры
            </h2>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed">
              Самые востребованные маршруты по Татарстану с актуальными датами
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl bg-white border border-emerald-200/50 shadow-sm">
            <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 font-bold">
              Доступно {tours.length} туров
            </span>
          </div>
        </div>

        {/* Сетка туров */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10 md:mb-12">
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

        {/* Кнопка "Все туры" */}
        {tours.length > 0 && (
          <div className="text-center">
            <Link
              href="/tours"
              className="group inline-flex items-center gap-2 sm:gap-3 px-6 py-3 sm:px-8 sm:py-4 bg-emerald-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-bold hover:bg-emerald-700 hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Смотреть все туры
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
