'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, MapPin, Calendar, Users } from 'lucide-react';

type PopularTour = {
  title: string;
  slug?: string;
  price?: number | null;
  startDateLabel?: string | null;
};

export function HeroSection({ popularTours }: { popularTours?: PopularTour[] | null }) {
  const items = useMemo(
    () =>
      popularTours && popularTours.length > 0
        ? popularTours
        : [{ title: 'Казань + Болгар', slug: undefined, price: null, startDateLabel: 'Скоро' }],
    [popularTours]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  // Сброс индекса при изменении количества элементов
  useEffect(() => {
    setActiveIndex((current) => {
      if (current >= items.length) {
        return 0;
      }
      return current;
    });
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  const activeTour = items[activeIndex] ?? items[0];

  return (
    <section className="relative w-full h-screen min-h-[500px] sm:min-h-[600px] md:min-h-[700px] max-h-[900px] flex items-center justify-center overflow-hidden">
      {/* Фоновое изображение - занимает всё пространство */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-tatarstan.jpg"
          alt="Красоты Татарстана"
          fill
          className="object-cover"
          priority
          quality={90}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/ABEAAA//2Q=="
          unoptimized={false}
        />
        {/* Темный оверлей для читаемости */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        {/* Дополнительный градиент снизу */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
      </div>

      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Контент */}
      <div className="relative z-10 w-full h-full flex items-center">
        <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 w-full">
          <div className="max-w-5xl">
            {/* Бейдж */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 sm:px-4 sm:py-2 mb-4 sm:mb-6 animate-fadeIn">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="text-white text-xs sm:text-sm font-medium">Откройте для себя Татарстан</span>
            </div>

            {/* Главный заголовок */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black text-white leading-[1.15] mb-3 sm:mb-4 md:mb-5 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              Путешествие по{' '}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300">
                Татарстану
              </span>
            </h1>

            {/* Описание */}
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-200 leading-relaxed mb-6 sm:mb-8 max-w-3xl animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              Экскурсии, маршруты и впечатления — всё в одном месте. Подберите тур под настроение и отправляйтесь в путь с проверенными гидами.
            </p>

            {/* Кнопки */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <Button 
                href="/tours" 
                variant="primary" 
                size="lg" 
                className="group shadow-2xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
              >
                Посмотреть туры
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                href="/about"
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-md border-2 border-white/30 text-white hover:bg-white hover:text-emerald-600 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
              >
                Узнать больше
              </Button>
            </div>

            {/* Преимущества */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
              {[
                { icon: Users, label: 'Поддержка 24/7', value: 'Всегда на связи' },
                { icon: MapPin, label: 'Безопасно', value: 'Проверенные гиды' },
                { icon: Calendar, label: 'Удобно', value: 'Быстрое бронирование' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-lg bg-white/10 backdrop-blur-md border border-white/20 p-3 sm:p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 mb-1 sm:mb-1.5">
                      <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/20 flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
                      </div>
                      <div className="text-white text-xs sm:text-sm md:text-base font-bold">{item.label}</div>
                    </div>
                    <div className="text-gray-300 text-[10px] sm:text-xs md:text-sm ml-7 sm:ml-9">{item.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Карточка популярного тура - справа */}
          <div className="hidden xl:block absolute right-8 top-1/2 -translate-y-1/2 w-80 animate-fadeInRight" style={{ animationDelay: '0.5s' }}>
            {activeTour.slug ? (
              <Link href={`/tours/${activeTour.slug}`} className="block">
                <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl hover:bg-white/15 transition-all duration-300 cursor-pointer">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white/80 text-sm font-medium uppercase tracking-wider">Популярный тур</span>
                  </div>
                  
                  <h3 className="text-white text-2xl font-bold mb-3 leading-tight line-clamp-2">
                    {activeTour.title}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    {activeTour.price ? (
                      <div className="text-emerald-300 text-2xl font-bold">
                        от {activeTour.price.toLocaleString('ru-RU')} ₽
                      </div>
                    ) : (
                      <div className="text-white/70 text-lg">Лучшие маршруты сезона</div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">Ближайший выезд</span>
                    <span className="text-white text-lg font-bold">
                      {activeTour.startDateLabel || 'Скоро'}
                    </span>
                  </div>

                </div>
              </Link>
            ) : (
              <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl hover:bg-white/15 transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/80 text-sm font-medium uppercase tracking-wider">Популярный тур</span>
                </div>
                
                <h3 className="text-white text-2xl font-bold mb-3 leading-tight line-clamp-2">
                  {activeTour.title}
                </h3>
                
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  {activeTour.price ? (
                    <div className="text-emerald-300 text-2xl font-bold">
                      от {activeTour.price.toLocaleString('ru-RU')} ₽
                    </div>
                  ) : (
                    <div className="text-white/70 text-lg">Лучшие маршруты сезона</div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Ближайший выезд</span>
                  <span className="text-white text-lg font-bold">
                    {activeTour.startDateLabel || 'Скоро'}
                  </span>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}
