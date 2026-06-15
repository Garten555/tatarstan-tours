import { redirect } from 'next/navigation';
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

  return (
    <div>
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

      <BookingsList />
    </div>
  );
}
