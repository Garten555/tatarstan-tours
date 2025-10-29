import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { Plus } from 'lucide-react';
import TourAdminList from '@/components/admin/TourAdminList';

export const metadata = {
  title: 'Управление турами - Админ панель',
  description: 'Управление турами',
};

export default async function AdminToursPage() {
  const supabase = await createServiceClient();

  // Получаем все туры
  const { data: tours } = await supabase
    .from('tours')
    .select(`
      id,
      title,
      slug,
      price_per_person,
      tour_type,
      category,
      start_date,
      end_date,
      status,
      current_participants,
      max_participants,
      cover_image,
      created_at
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Управление турами</h1>
          <p className="mt-2 text-gray-600">
            Создание и редактирование туров
          </p>
        </div>
        <Link
          href="/admin/tours/create"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать тур
        </Link>
      </div>

      {/* Список туров */}
      <TourAdminList tours={tours || []} />
    </div>
  );
}

