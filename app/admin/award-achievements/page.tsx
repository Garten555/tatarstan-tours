import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import AwardAchievementsList from '@/components/admin/AwardAchievementsList';
import { Award } from 'lucide-react';

export const metadata = {
  title: 'Выдача достижений - Админ панель',
  description: 'Выдача достижений участникам туров',
};

export default async function AwardAchievementsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем авторизацию
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Получаем роль пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'user';

  // Проверяем, является ли пользователь гидом или админом
  if (userRole !== 'guide' && userRole !== 'tour_admin' && userRole !== 'super_admin') {
    redirect('/');
  }

  // Загружаем комнаты где пользователь является гидом
  const { data: roomsData, error } = await serviceClient
    .from('tour_rooms')
    .select(`
      id,
      tour_id,
      is_active,
      created_at,
      tour:tours(
        id,
        title,
        start_date,
        end_date,
        city:cities(name)
      )
    `)
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  // Преобразуем данные для соответствия типу Room
  const rooms = (roomsData || []).map((room: any) => ({
    id: room.id,
    tour_id: room.tour_id,
    is_active: room.is_active,
    created_at: room.created_at,
    tour: Array.isArray(room.tour) && room.tour.length > 0 ? room.tour[0] : (room.tour || null),
  }));

  return (
    <div>
      {/* Заголовок в стиле главной страницы */}
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-amber-100/50 border border-amber-200/50 rounded-xl">
            <span className="text-sm font-bold text-amber-700">Достижения</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <Award className="w-7 h-7 md:w-8 md:h-8 text-amber-600" />
          Выдача достижений
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Выдавайте достижения участникам ваших туров за активность и заслуги
        </p>
      </div>

      {/* Список туров с участниками */}
      <AwardAchievementsList rooms={rooms || []} />
    </div>
  );
}



