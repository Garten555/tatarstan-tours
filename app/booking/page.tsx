import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { TourSessionRow } from '@/lib/types/tour-session';
import BookingForm from '@/components/booking/BookingForm';

export const metadata = {
  title: 'Бронирование тура | Туры по Татарстану',
  description: 'Забронируйте тур',
};

interface BookingPageProps {
  searchParams: Promise<{ tour?: string; session?: string }>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const { tour: tourId, session: sessionIdFromQuery } = await searchParams;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const bookingPath =
      tourId && sessionIdFromQuery
        ? `/booking?tour=${encodeURIComponent(tourId)}&session=${encodeURIComponent(sessionIdFromQuery)}`
        : tourId
          ? `/booking?tour=${encodeURIComponent(tourId)}`
          : '/booking';
    redirect(`/auth?redirect=${encodeURIComponent(bookingPath)}`);
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

  const now = new Date();

  let sessionRow: TourSessionRow | null = null;

  const sessionProbe = await serviceClient
    .from('tour_sessions')
    .select('id')
    .eq('tour_id', tourId)
    .limit(1);
  const tourHasSessions =
    !sessionProbe.error &&
    Array.isArray(sessionProbe.data) &&
    sessionProbe.data.length > 0;

  if (tourHasSessions) {
    if (!sessionIdFromQuery) {
      redirect(`/tours/${(tour as any).slug}?error=pick_session`);
    }
    const { data: srow, error: sErr } = await serviceClient
      .from('tour_sessions')
      .select('id, start_at, end_at, max_participants, current_participants, status')
      .eq('id', sessionIdFromQuery)
      .eq('tour_id', tourId)
      .single();
    if (sErr || !srow || (srow as any).status !== 'active') {
      redirect(`/tours/${(tour as any).slug}?error=session`);
    }
    sessionRow = srow as TourSessionRow;
    const endS = sessionRow.end_at ? new Date(sessionRow.end_at) : null;
    const startS = new Date(sessionRow.start_at);
    if (endS && endS <= now) {
      redirect(`/tours/${(tour as any).slug}?error=expired`);
    }
    if (!endS && startS <= now) {
      redirect(`/tours/${(tour as any).slug}?error=expired`);
    }
    const spots =
      sessionRow.max_participants - (sessionRow.current_participants ?? 0);
    if (spots <= 0) {
      redirect(`/tours/${(tour as any).slug}?error=full`);
    }
  } else {
    const endDate = (tour as any).end_date ? new Date((tour as any).end_date) : null;
    if (endDate && endDate <= now) {
      redirect(`/tours/${(tour as any).slug}?error=expired`);
    }
    const availableSpots =
      (tour as any).max_participants - ((tour as any).current_participants || 0);
    if (availableSpots <= 0) {
      redirect(`/tours/${(tour as any).slug}?error=full`);
    }
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
          session={sessionRow}
          user={user}
          savedCards={savedCards || []}
        />
      </div>
    </div>
  );
}


