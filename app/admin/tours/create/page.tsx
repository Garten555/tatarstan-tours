import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TourForm from '@/components/admin/TourForm';

export const metadata = {
  title: 'Создать тур - Админ панель',
  description: 'Создание нового тура',
};

export default async function CreateTourPage() {
  const supabase = await createClient();

  // Проверяем права (tour_admin или super_admin)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'tour_admin' && profile?.role !== 'super_admin') {
    redirect('/admin');
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Создать новый тур</h1>
        <p className="mt-2 text-gray-600">
          Заполните данные для создания нового тура
        </p>
      </div>

      {/* Форма */}
      <TourForm mode="create" />
    </div>
  );
}

