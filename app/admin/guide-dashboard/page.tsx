import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Calendar, Users, MessageSquare, MapPin, Clock } from 'lucide-react';

export const metadata = {
  title: 'Панель гида - Админ панель',
  description: 'Панель управления гида',
};

export default async function GuideDashboard() {
  const supabase = await createServiceClient();
  const authClient = await createClient();

  // Проверяем авторизацию и роль
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'guide') {
    redirect('/admin');
  }

  // Получаем комнаты гида
  const { data: rooms } = await supabase
    .from('tour_rooms')
    .select(`
      id,
      created_at,
      tour:tours(
        id,
        title,
        start_date,
        end_date,
        max_participants
      )
    `)
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  // Подсчитываем статистику
  const now = new Date();
  const activeRooms = (rooms || []).filter((room: any) => {
    const startDate = room.tour?.start_date ? new Date(room.tour.start_date) : null;
    const endDate = room.tour?.end_date ? new Date(room.tour.end_date) : null;
    if (!startDate) return false;
    return startDate <= now && (!endDate || endDate >= now);
  });

  const upcomingRooms = (rooms || []).filter((room: any) => {
    const startDate = room.tour?.start_date ? new Date(room.tour.start_date) : null;
    if (!startDate) return false;
    return startDate > now;
  });

  const completedRooms = (rooms || []).filter((room: any) => {
    const endDate = room.tour?.end_date ? new Date(room.tour.end_date) : null;
    if (!endDate) return false;
    return endDate < now;
  });

  // Получаем количество участников
  const roomIds = (rooms || []).map((r: any) => r.id);
  let totalParticipants = 0;
  if (roomIds.length > 0) {
    const { count } = await supabase
      .from('tour_room_participants')
      .select('*', { count: 'exact', head: true })
      .in('room_id', roomIds);
    totalParticipants = count || 0;
  }

  // Получаем количество непрочитанных сообщений
  let unreadMessages = 0;
  if (roomIds.length > 0) {
    const { count } = await supabase
      .from('tour_room_messages')
      .select('*', { count: 'exact', head: true })
      .in('room_id', roomIds)
      .eq('is_read', false)
      .neq('user_id', user.id);
    unreadMessages = count || 0;
  }

  const stats = {
    totalRooms: rooms?.length || 0,
    activeRooms: activeRooms.length,
    upcomingRooms: upcomingRooms.length,
    completedRooms: completedRooms.length,
    totalParticipants,
    unreadMessages,
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Панель гида</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Управление вашими турами и общение с участниками
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Всего туров</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalRooms}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Идет сейчас</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{stats.activeRooms}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Предстоит</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{stats.upcomingRooms}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Завершено</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-600 mt-1">{stats.completedRooms}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Участников</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{stats.totalParticipants}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Непрочитанных</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">{stats.unreadMessages}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/my-tours"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all"
          >
            <MapPin className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-900">Мои туры</p>
              <p className="text-sm text-gray-600">Управление турами</p>
            </div>
          </Link>
          <Link
            href="/admin/tour-rooms"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all"
          >
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-900">Комнаты туров</p>
              <p className="text-sm text-gray-600">Общение с участниками</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}



