import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import BookingsList from '@/components/admin/BookingsList';
import { Calendar } from 'lucide-react';
import { getAdminViewer } from '@/lib/admin/get-admin-viewer';

export const metadata = {
  title: 'Бронирования - Админ панель',
  description: 'Управление бронированиями туров',
};

export default async function BookingsPage() {
  const viewer = await getAdminViewer();
  if (!viewer) {
    redirect('/auth/login');
  }

  if (viewer.role !== 'tour_admin' && viewer.role !== 'super_admin') {
    redirect('/admin');
  }

  const serviceClient = createServiceClient();

  const { data: bookings, error } = await serviceClient
    .from('bookings')
    .select(`
      *,
      departure_start_at,
      departure_end_at,
      schedule_superseded_at,
      user:profiles!bookings_user_id_fkey(
        id,
        first_name,
        last_name,
        email
      ),
      tour_session:tour_sessions!bookings_session_id_fkey(
        start_at,
        end_at
      ),
      tour:tours!bookings_tour_id_fkey(
        id,
        title,
        slug,
        start_date,
        end_date,
        status,
        price_per_person
      )
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  return (
    <div>
      {/* Заголовок в стиле главной страницы */}
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-blue-100/50 border border-blue-200/50 rounded-xl">
            <span className="text-sm font-bold text-blue-700">Бронирования</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <Calendar className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
          Бронирования
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Управление всеми бронированиями туров
        </p>
      </div>

      <BookingsList 
        bookings={bookings || []} 
        error={error}
      />
    </div>
  );
}

















