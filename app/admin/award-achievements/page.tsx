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
  const { data: roomsData } = await serviceClient
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
  interface RoomData {
    id: unknown;
    tour_id: unknown;
    is_active: unknown;
    created_at: unknown;
    tour: Array<{
      id: unknown;
      title: unknown;
      start_date: unknown;
      end_date: unknown;
      city: Array<{ name: unknown }> | { name: unknown } | null;
    }> | {
      id: unknown;
      title: unknown;
      start_date: unknown;
      end_date: unknown;
      city: Array<{ name: unknown }> | { name: unknown } | null;
    } | null;
  }

  const rooms = (roomsData || []).map((room: RoomData) => {
    let tour: {
      id: unknown;
      title: unknown;
      start_date: unknown;
      end_date: unknown;
      city: Array<{ name: unknown }> | { name: unknown } | null;
    } | null = null;

    if (Array.isArray(room.tour) && room.tour.length > 0) {
      tour = room.tour[0];
    } else if (room.tour && !Array.isArray(room.tour)) {
      tour = room.tour;
    }

    let city: { name: unknown } | null = null;
    if (tour && tour.city) {
      if (Array.isArray(tour.city) && tour.city.length > 0) {
        city = tour.city[0];
      } else if (!Array.isArray(tour.city)) {
        city = tour.city;
      }
    }

    return {
      id: String(room.id),
      tour_id: String(room.tour_id),
      is_active: Boolean(room.is_active),
      created_at: String(room.created_at),
      tour: tour ? {
        id: String(tour.id),
        title: String(tour.title),
        start_date: String(tour.start_date),
        end_date: tour.end_date ? String(tour.end_date) : null,
        city: city ? { name: String(city.name) } : undefined,
      } : null,
    };
  });

  // Фильтруем комнаты без туров и преобразуем city: null в undefined
  const validRooms = rooms
    .filter((r) => r.tour !== null)
    .map((r) => ({
      ...r,
      tour: {
        ...r.tour!,
        city: r.tour!.city || undefined,
      },
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
      <AwardAchievementsList rooms={validRooms} />
    </div>
  );
}



