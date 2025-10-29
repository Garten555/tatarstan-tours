import { Metadata } from 'next';
import TourGrid from '@/components/tours/TourGrid';

// SEO метаданные для страницы туров
export const metadata: Metadata = {
  title: 'Туры по Татарстану',
  description: 'Откройте для себя лучшие туры по Татарстану. Казань, Свияжск, Булгар, Елабуга и другие уникальные места. Экскурсии с профессиональными гидами.',
  keywords: ['туры по Татарстану', 'экскурсии Казань', 'туры Свияжск', 'туры Булгар', 'экскурсии Елабуга', 'путешествия Татарстан'],
  openGraph: {
    title: 'Туры по Татарстану',
    description: 'Откройте для себя лучшие туры по Татарстану. Казань, Свияжск, Булгар, Елабуга и другие уникальные места.',
    images: ['/og-tours.jpg'],
  },
};

export default function ToursPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero секция для страницы туров */}
      <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Туры по Татарстану
            </h1>
            <p className="text-xl md:text-2xl text-emerald-50 max-w-3xl mx-auto">
              Откройте для себя красоту и культуру Татарстана вместе с нами
            </p>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-emerald-600 mb-2">15+</div>
              <div className="text-gray-600">Туров</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-600 mb-2">5000+</div>
              <div className="text-gray-600">Туристов</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-600 mb-2">50+</div>
              <div className="text-gray-600">Гидов</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-600 mb-2">4.9</div>
              <div className="text-gray-600">Рейтинг</div>
            </div>
          </div>
        </div>
      </section>

      {/* Сетка туров */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <TourGrid />
      </section>
    </div>
  );
}


