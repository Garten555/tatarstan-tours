import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import BookingDetails from '@/components/admin/BookingDetails';

export const metadata = {
  title: 'Детали бронирования - Админ панель',
  description: 'Детальная информация о бронировании',
};

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Проверяем права
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const typedProfile = (profile ?? null) as { role?: string | null } | null;

  if (typedProfile?.role !== 'tour_admin' && typedProfile?.role !== 'super_admin') {
    redirect('/admin');
  }

  // Загружаем бронирование
  const { data: booking, error } = await serviceClient
    .from('bookings')
    .select(`
      *,
      user:profiles!bookings_user_id_fkey(
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      tour:tours!bookings_tour_id_fkey(
        id,
        title,
        slug,
        start_date,
        end_date,
        price_per_person,
        max_participants,
        current_participants,
        city:cities(name)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !booking) {
    notFound();
  }

  // Загружаем участников бронирования
  const { data: attendees } = await serviceClient
    .from('booking_attendees')
    .select('*')
    .eq('booking_id', id)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <BookingDetails 
        booking={booking as any}
        attendees={attendees || []}
      />
    </div>
  );
}






















