import { createServiceClient } from '@/lib/supabase/server';
import DashboardStats from '@/components/admin/DashboardStats';

export const metadata = {
  title: 'Панель управления - Админ панель',
  description: 'Административная панель Tatarstan Tours',
};

export default async function AdminDashboard() {
  const supabase = await createServiceClient();

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

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Панель управления</h1>
        <p className="mt-2 text-gray-600">
          Обзор платформы Tatarstan Tours
        </p>
      </div>

      {/* Статистика */}
      <DashboardStats stats={stats} />

      {/* Последние бронирования */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Последние бронирования
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тур
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Цена
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentBookings?.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(booking.tour as any)?.title || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(booking.user as any)?.first_name} {(booking.user as any)?.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.total_price} ₽
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(booking.created_at).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
