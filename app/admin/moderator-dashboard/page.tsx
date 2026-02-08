import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MessageSquare, Users, AlertCircle, Shield } from 'lucide-react';

export const metadata = {
  title: 'Панель модератора - Админ панель',
  description: 'Панель управления модератора',
};

export default async function ModeratorDashboard() {
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

  if (profile?.role !== 'support_admin') {
    redirect('/admin');
  }

  // Получаем статистику чата поддержки
  const { count: totalSessions } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('is_ai', false);

  // Получаем количество активных сессий (сессии с сообщениями за последние 24 часа)
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  const { count: activeSessions } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('is_ai', false)
    .gte('created_at', yesterday.toISOString());

  // Получаем количество непрочитанных сообщений от пользователей
  const { count: unreadMessages } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('is_ai', false)
    .eq('is_support', false)
    .eq('is_read', false);

  // Получаем количество заблокированных пользователей
  const { count: bannedUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_banned', true);

  // Получаем количество отзывов на модерации
  const { count: pendingReviews } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', false);

  // Получаем количество комнат туров
  const { count: totalRooms } = await supabase
    .from('tour_rooms')
    .select('*', { count: 'exact', head: true });

  const stats = {
    totalSessions: totalSessions || 0,
    activeSessions: activeSessions || 0,
    unreadMessages: unreadMessages || 0,
    bannedUsers: bannedUsers || 0,
    pendingReviews: pendingReviews || 0,
    totalRooms: totalRooms || 0,
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Панель модератора</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Управление поддержкой, модерация контента и пользователи
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Всего сессий</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{stats.totalSessions}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Активных сессий</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{stats.activeSessions}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-emerald-600" />
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
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Заблокировано</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1">{stats.bannedUsers}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Отзывов на модерации</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600 mt-1">{stats.pendingReviews}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base text-gray-600 font-medium">Комнат туров</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{stats.totalRooms}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/chat"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-900">Чат поддержки</p>
              <p className="text-sm text-gray-600">Общение с пользователями</p>
            </div>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all"
          >
            <Shield className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-gray-900">Пользователи</p>
              <p className="text-sm text-gray-600">Управление и блокировки</p>
            </div>
          </Link>
          <Link
            href="/admin/reviews"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-all"
          >
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-gray-900">Отзывы</p>
              <p className="text-sm text-gray-600">Модерация отзывов</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

