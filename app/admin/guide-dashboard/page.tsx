import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAdminViewer } from '@/lib/admin/get-admin-viewer';
import Link from 'next/link';
import { Calendar, Users, MessageSquare, MapPin, Clock } from 'lucide-react';
import { loadGuideTourRooms } from '@/lib/admin/guide-tour-room-rows';
import { roomTourLifecycle } from '@/lib/achievements/dedupe-award-rooms';
import { getTourRoomNotificationSummary } from '@/lib/notifications/tour-room-notification-summary';

export const metadata = {
  title: 'Панель гида - Админ панель',
  description: 'Панель управления гида',
};

export default async function GuideDashboard() {
  const supabase = createServiceClient();
  const viewer = await getAdminViewer();
  if (!viewer) {
    redirect('/auth');
  }

  if (viewer.role !== 'guide') {
    redirect('/admin');
  }

  const [rooms, notificationSummary] = await Promise.all([
    loadGuideTourRooms(supabase, { guideId: viewer.userId, resolveCanonical: false }),
    getTourRoomNotificationSummary(supabase, viewer.userId),
  ]);

  const activeRooms = rooms.filter((room) => roomTourLifecycle(room) === 'ongoing');
  const upcomingRooms = rooms.filter((room) => roomTourLifecycle(room) === 'upcoming');
  const completedRooms = rooms.filter((room) => roomTourLifecycle(room) === 'ended');

  const totalParticipants = rooms.reduce(
    (sum, room) => sum + (room.participants_count ?? 0),
    0
  );

  const stats = {
    totalRooms: rooms.length,
    activeRooms: activeRooms.length,
    upcomingRooms: upcomingRooms.length,
    completedRooms: completedRooms.length,
    totalParticipants,
    unreadMessages: notificationSummary.tour_room_message,
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Панель гида</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Управление вашими турами и общение с участниками
        </p>
      </div>

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
