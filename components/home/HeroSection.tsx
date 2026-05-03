'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, MapPin, Calendar, Users } from 'lucide-react';

type PopularTour = {
  title: string;
  slug?: string;
  price?: number | null;
  shortDesc?: string | null;
  durationLabel?: string | null;
  startDateLabel?: string | null;
};

const FALLBACK_TOUR: PopularTour = {
  title: 'Казань + Болгар',
  slug: undefined,
  price: null,
  shortDesc: 'Групповая экскурсия по классическому маршруту',
  durationLabel: null,
  startDateLabel: null,
};

function GlassTourCard({ tour, linked }: { tour: PopularTour; linked: boolean }) {
  const inner = (
    <div className="relative cursor-pointer rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 group-hover/card:border-emerald-400/40 group-hover/card:bg-white/15">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">Ближайший выезд</span>
      </div>

      <h3 className="mb-2 text-2xl font-bold leading-tight text-white transition-colors group-hover/card:text-emerald-200">
        {tour.title}
      </h3>

      <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/75">
        {tour.shortDesc?.trim() || 'Экскурсии и маршруты по Татарстану — с проверенными гидами.'}
      </p>

      {tour.price != null && tour.price > 0 ? (
        <div className="mb-4 text-2xl font-bold text-emerald-300">от {tour.price.toLocaleString('ru-RU')} ₽</div>
      ) : (
        <div className="mb-4 text-lg text-white/80">Лучшие маршруты сезона</div>
      )}

      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-sm text-white/70">{tour.durationLabel || 'Даты уточняются'}</span>
        <span className="text-lg font-bold text-white">{tour.startDateLabel || 'Скоро'}</span>
      </div>
    </div>
  );

  if (linked && tour.slug) {
    return (
      <Link href={`/tours/${tour.slug}`} className="group/card block">
        {inner}
      </Link>
    );
  }

  return <div className="group/card">{inner}</div>;
}

export function HeroSection({ popularTours }: { popularTours?: PopularTour[] | null }) {
  const items = useMemo(
    () => (popularTours && popularTours.length > 0 ? popularTours : [FALLBACK_TOUR]),
    [popularTours]
  );

  const activeTour = items[0];

  return (
    <section className="relative flex max-h-[900px] min-h-[500px] w-full items-center justify-center overflow-hidden sm:min-h-[600px] md:min-h-[700px] h-screen">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
      </div>

      <div className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 animate-pulse rounded-full bg-emerald-500/20 blur-3xl" />
        <div
          className="absolute -right-32 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-sky-500/20 blur-3xl"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full items-center">
        <div className="container relative mx-auto w-full px-4 sm:px-5 md:px-6 lg:px-8">
          <div className="max-w-5xl xl:max-w-6xl xl:pr-[22rem] 2xl:pr-[23rem]">
            <div className="animate-fadeIn mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md sm:mb-6 sm:gap-2 sm:px-4 sm:py-2">
              <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-emerald-400 sm:h-2 sm:w-2" />
              <span className="text-xs font-medium text-white sm:text-sm">Открой для себя Татарстан</span>
            </div>

            <h1
              className="animate-fadeInUp mb-3 text-4xl font-black leading-[1.12] sm:mb-4 sm:text-5xl md:mb-5 md:text-6xl lg:text-6xl lg:leading-[1.1] xl:text-7xl 2xl:text-8xl"
              style={{ animationDelay: '0.1s' }}
            >
              <span className="block text-white">Путешествие по</span>
              <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                Татарстану
              </span>
            </h1>

            <p
              className="animate-fadeInUp mb-6 max-w-3xl text-sm leading-relaxed text-gray-200 sm:mb-8 sm:text-base md:text-lg lg:text-xl xl:text-2xl"
              style={{ animationDelay: '0.2s' }}
            >
              Экскурсии, маршруты и впечатления — всё в одном месте. Подберите тур под настроение и отправляйтесь в путь с
              проверенными гидами.
            </p>

            <div
              className="animate-fadeInUp mb-8 flex flex-col gap-2 sm:mb-10 sm:flex-row sm:gap-3 md:mb-12"
              style={{ animationDelay: '0.3s' }}
            >
              <Button
                href="/tours"
                variant="primary"
                size="lg"
                className="group text-sm shadow-2xl transition-all duration-300 hover:scale-105 hover:!brightness-110 hover:shadow-emerald-500/50 sm:text-base"
              >
                Посмотреть туры
                <ArrowRight className="ml-2 h-4 w-4 text-white transition-transform group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Button>
              <Button
                href="/about"
                variant="outline"
                size="lg"
                className="group border-2 border-white/30 bg-white/10 text-sm text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white hover:text-emerald-600 sm:text-base"
              >
                Узнать больше
              </Button>
            </div>

            <div className="animate-fadeInUp grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" style={{ animationDelay: '0.4s' }}>
              {[
                { icon: Users, label: 'Поддержка 24/7', value: 'Всегда на связи' },
                { icon: MapPin, label: 'Безопасно', value: 'Проверенные гиды' },
                { icon: Calendar, label: 'Удобно', value: 'Быстрое бронирование' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/15 sm:p-4"
                  >
                    <div className="mb-1 flex items-center gap-2 sm:mb-1.5 sm:gap-2.5">
                      <div className="flex-shrink-0 rounded-lg bg-emerald-500/20 p-1 sm:p-1.5">
                        <Icon className="h-3.5 w-3.5 text-emerald-300 sm:h-4 sm:w-4" />
                      </div>
                      <div className="text-xs font-bold text-white sm:text-sm md:text-base">{item.label}</div>
                    </div>
                    <div className="ml-7 text-[10px] text-gray-300 sm:ml-9 sm:text-xs md:text-sm">{item.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="animate-fadeInRight absolute right-6 top-1/2 z-10 hidden w-80 max-w-[calc(100%-2rem)] -translate-y-1/2 xl:block 2xl:right-10"
            style={{ animationDelay: '0.5s' }}
          >
            <GlassTourCard tour={activeTour} linked={Boolean(activeTour.slug)} />
          </div>
        </div>
      </div>
    </section>
  );
}
