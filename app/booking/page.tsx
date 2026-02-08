import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import BookingForm from '@/components/booking/BookingForm';

export const metadata = {
  title: 'Бронирование тура | Туры по Татарстану',
  description: 'Забронируйте тур',
};

interface BookingPageProps {
  searchParams: Promise<{ tour?: string }>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const { tour: tourId } = await searchParams;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/booking' + (tourId ? `?tour=${tourId}` : ''));
  }

  if (!tourId) {
    redirect('/tours');
  }

  // Загружаем данные тура
  const { data: tour, error: tourError } = await serviceClient
    .from('tours')
    .select(`
      *,
      city:cities(id, name)
    `)
    .eq('id', tourId)
    .eq('status', 'active')
    .single();

  if (tourError || !tour) {
    redirect('/tours');
  }

  // Проверяем даты тура
  const now = new Date();
  const startDate = new Date((tour as any).start_date);
  const endDate = (tour as any).end_date ? new Date((tour as any).end_date) : null;

  // Тур закончился - редирект
  if (endDate && endDate <= now) {
    redirect(`/tours/${(tour as any).slug}?error=expired`);
  }

  const availableSpots = (tour as any).max_participants - ((tour as any).current_participants || 0);
  if (availableSpots <= 0) {
    redirect(`/tours/${(tour as any).slug}?error=full`);
  }

  // Загружаем сохраненные карты пользователя
  const { data: savedCards } = await supabase
    .from('user_cards')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50/50 py-8 lg:py-12 relative overflow-x-hidden">
      {/* Декоративные элементы фона */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-200/15 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4">
        <BookingForm 
          tour={tour as any} 
          user={user}
          savedCards={savedCards || []}
        />
      </div>
    </div>
  );
}


