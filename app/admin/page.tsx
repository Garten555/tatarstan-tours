import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import DashboardStats from '@/components/admin/DashboardStats';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Панель управления - Админ панель',
  description: 'Административная панель Tatarstan Tours',
};

export default async function AdminDashboard() {
  const supabase = await createServiceClient();
  const authClient = await createClient();

  // Проверяем роль пользователя и перенаправляем на соответствующий дашборд
  const { data: { user } } = await authClient.auth.getUser();
  if (user) {
    const { data: profile } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'guide') {
      redirect('/admin/guide-dashboard');
    }
    if (profile?.role === 'support_admin') {
      redirect('/admin/moderator-dashboard');
    }
  }

  // Получаем статистику
  const [
    { count: totalUsers },
    { count: totalTours },
    { count: totalBookings },
    { count: totalReviews },
    { count: activeBookings },
    { count: pendingReviews },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('tours').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('is_approved', false),
  ]);

  // Последние бронирования
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select(`
      id,
      created_at,
      status,
      total_price,
      tour:tours(title),
      user:profiles(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  const stats = {
    totalUsers: totalUsers || 0,
    totalTours: totalTours || 0,
    totalBookings: totalBookings || 0,
    totalReviews: totalReviews || 0,
    activeBookings: activeBookings || 0,
    pendingReviews: pendingReviews || 0,
  };

  const recentBookingsTyped = (recentBookings ?? []) as any[];

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Панель управления</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Обзор платформы "Туры по Татарстану"
        </p>
      </div>

      {/* Статистика */}
      <DashboardStats stats={stats} />

      {/* Последние бронирования */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
          Последние бронирования
        </h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тур
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Пользователь
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цена
                  </th>
                  <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBookingsTyped.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 max-w-[150px] sm:max-w-none truncate sm:whitespace-nowrap">
                      {(booking.tour as any)?.title || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden sm:table-cell whitespace-nowrap">
                      {(booking.user as any)?.first_name} {(booking.user as any)?.last_name}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-semibold rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status === 'confirmed' ? 'Подтверждено' :
                         booking.status === 'pending' ? 'Ожидает' :
                         booking.status === 'cancelled' ? 'Отменено' : booking.status}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 font-medium">
                      {booking.total_price} ₽
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                      {new Date(booking.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
