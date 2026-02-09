import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import GuideToursList from '@/components/admin/GuideToursList';

export const metadata = {
  title: 'Мои туры - Админ панель',
  description: 'Управление турами, где вы назначены гидом',
};

export default async function MyToursPage() {
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
  if (userRole !== 'guide' && userRole !== 'tour_admin' && userRole !== 'super_admin' && userRole !== 'support_admin') {
    redirect('/');
  }

  // Загружаем комнаты где пользователь является гидом
  const { data: rooms } = await serviceClient
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
      ),
      participants:tour_room_participants(count)
    `)
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  // Типизируем комнаты
  interface RoomWithTour {
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

  // Подсчитываем количество участников для каждой комнаты
  const roomsWithCounts = await Promise.all(
    (rooms || []).map(async (room: RoomWithTour) => {
      const { count } = await serviceClient
        .from('tour_room_participants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', String(room.id));

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
        participants_count: count || 0,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Мои туры</h1>
        <p className="mt-2 text-gray-600">
          Управление комнатами туров, где вы назначены гидом
        </p>
      </div>

      {/* Список туров */}
      <GuideToursList rooms={roomsWithCounts.filter((r) => r.tour !== null) as Array<{
        id: string;
        tour_id: string;
        is_active: boolean;
        created_at: string;
        tour: {
          id: string;
          title: string;
          start_date: string;
          end_date: string | null;
          city?: { name: string } | undefined;
        };
        participants_count: number;
      }>} />
    </div>
  );
}












