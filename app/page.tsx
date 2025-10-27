import { HeroSection } from '@/components/home/HeroSection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      
      {/* Дополнительные секции будут добавлены позже */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Скоро здесь будут популярные туры
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Мы работаем над созданием уникальных маршрутов по Татарстану
          </p>
        </div>
      </section>
    </main>
  );
}
