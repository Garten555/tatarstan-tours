import { Metadata } from 'next';
import FriendsPage from '@/components/friends/FriendsPage';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Друзья | Туры по Татарстану',
  description: 'Управляйте своими друзьями и находите новых',
};

export default function FriendsRoutePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero секция */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-white">
        {/* Декоративные элементы */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-purple-100/40 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
          {/* Кнопка назад */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-all duration-200 group mb-8"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold text-base md:text-lg">На главную</span>
          </Link>

          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/50 border border-blue-200/50 px-4 py-2 mb-6">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-700 text-sm font-semibold uppercase tracking-wider">Друзья</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-5">
              Друзья
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 font-medium leading-relaxed">
              Управляйте своими друзьями, просматривайте запросы и находите новых друзей
            </p>
          </div>
        </div>
      </section>

      {/* Контент */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <FriendsPage />
          </div>
        </div>
      </section>
    </main>
  );
}

