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
  const { data: rooms, error } = await serviceClient
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

  // Подсчитываем количество участников для каждой комнаты
  const roomsWithCounts = await Promise.all(
    (rooms || []).map(async (room: any) => {
      const { count } = await serviceClient
        .from('tour_room_participants')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id);

      return {
        ...room,
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
      <GuideToursList rooms={roomsWithCounts} />
    </div>
  );
}











