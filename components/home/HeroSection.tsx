import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export function HeroSection() {
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Фоновое изображение */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-tatarstan.jpg"
          alt="Красоты Татарстана"
          fill
          className="object-cover"
          priority
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/ABEAAA//2Q=="
        />
        {/* Затемнение */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />
      </div>

      {/* Декоративный татарский орнамент */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
        <svg viewBox="0 0 200 200" className="text-emerald-500">
          <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="2" fill="currentColor" />
            <path d="M20 10 L30 20 L20 30 L10 20 Z" stroke="currentColor" strokeWidth="0.5" fill="none" />
          </pattern>
          <rect width="200" height="200" fill="url(#pattern)" />
        </svg>
      </div>

      {/* Контент */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeInUp">
          {/* Подзаголовок */}
          <div className="inline-block">
            <span className="px-4 py-2 bg-emerald-600/90 text-white text-sm font-medium rounded-full backdrop-blur-sm">
              Откройте для себя Татарстан
            </span>
          </div>

          {/* Главный заголовок */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            Путешествие по{' '}
            <span className="text-emerald-400">Татарстану</span>
          </h1>

          {/* Описание */}
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Исследуйте богатую историю, уникальную культуру и захватывающие пейзажи 
            республики с нашими экспертными гидами
          </p>

          {/* Особенности */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <div className="flex items-center space-x-2 text-white bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Интерактивные карты</span>
            </div>
            
            <div className="flex items-center space-x-2 text-white bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Гибкое расписание</span>
            </div>
            
            <div className="flex items-center space-x-2 text-white bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">Безопасность</span>
            </div>
          </div>

          {/* Кнопки призыва к действию */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button href="/tours" variant="primary" size="lg" className="shadow-xl hover:shadow-2xl">
              Посмотреть туры
            </Button>
            <Button href="/about" variant="outline" size="lg" className="bg-white/10 backdrop-blur-md border-white text-white hover:bg-white hover:text-emerald-600">
              Узнать больше
            </Button>
          </div>

          {/* Индикатор прокрутки */}
          <div className="pt-12 animate-bounce">
            <svg className="w-6 h-6 mx-auto text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

