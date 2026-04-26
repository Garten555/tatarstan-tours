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

  interface BookingWithRelations {
    id: string;
    created_at: string;
    status: string;
    total_price: number;
    user?: { id: string; first_name: string; last_name: string; email: string; phone: string | null } | null;
    tour?: { id: string; title: string; slug: string; start_date: string; end_date: string | null; price_per_person: number; max_participants: number; current_participants: number; city?: { name: string } | null } | null;
    [key: string]: unknown;
  }

  return (
    <div className="space-y-6">
      <BookingDetails 
        booking={booking as BookingWithRelations}
        attendees={attendees || []}
      />
    </div>
  );
}























