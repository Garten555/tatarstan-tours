import { Metadata } from 'next';
import { Suspense } from 'react';
import UserMessenger from '@/components/messenger/UserMessenger';
import { ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Мессенджер | Туры по Татарстану',
  description: 'Приватные сообщения с другими пользователями',
};

export default function MessengerPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero секция */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-white">
        {/* Декоративные элементы */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-violet-100/40 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
          {/* Кнопка назад */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-all duration-200 group mb-8"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold text-base md:text-lg">На главную</span>
          </Link>

          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/50 border border-emerald-200/50 px-4 py-2 mb-6">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 text-sm font-semibold uppercase tracking-wider">Общение</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-5">
              Мессенджер
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 font-medium leading-relaxed">
              Общайтесь с другими пользователями в приватных сообщениях
            </p>
          </div>
        </div>
      </section>

      {/* Контент */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          }>
            <UserMessenger />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
