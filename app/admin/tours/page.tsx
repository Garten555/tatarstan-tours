import Link from 'next/link';
import { Plus, Map } from 'lucide-react';
import TourAdminList from '@/components/admin/TourAdminList';

export const metadata = {
  title: 'Управление турами - Админ панель',
  description: 'Управление турами',
};

export default function AdminToursPage() {
  return (
    <div>
      {/* Заголовок в стиле главной страницы */}
      <div className="mb-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
                <span className="text-sm font-bold text-emerald-700">Туры</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
              <Map className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
              Управление турами
            </h1>
            <p className="text-lg md:text-xl font-bold text-gray-700">
              Создание и редактирование туров
            </p>
          </div>
          <Link
            href="/admin/tours/create"
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-black text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Создать тур
          </Link>
        </div>
      </div>

      {/* Список туров с фильтрацией и пагинацией */}
      <TourAdminList />
    </div>
  );
}

