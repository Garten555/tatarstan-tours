import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UserBookings from '@/components/profile/UserBookings';

export const metadata = {
  title: 'Мои бронирования | Туры по Татарстану',
  description: 'История и управление бронированиями',
};

export default async function ProfileBookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/profile/bookings');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <UserBookings />
      </div>
    </div>
  );
}















