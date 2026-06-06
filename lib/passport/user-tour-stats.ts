import type { SupabaseClient } from '@supabase/supabase-js';

const BOOKING_TOUR_SELECT = `
  id,
  tour_id,
  booking_date,
  status,
  tour:tours!bookings_tour_id_fkey(
    id,
    title,
    slug,
    cover_image,
    start_date,
    end_date,
    yandex_map_url,
    city:cities(id, name)
  )
`;

const ACHIEVEMENT_TOUR_SELECT = `
  id,
  tour_id,
  unlock_date,
  tour:tours!achievements_tour_id_fkey(
    id,
    title,
    slug,
    cover_image,
    start_date,
    end_date,
    yandex_map_url,
    city:cities(id, name)
  )
`;

export type ParticipatedTourRow = {
  id: string;
  tour_id: string;
  status: string;
  booking_date: string | null;
  tour: {
    id: string;
    title: string;
    slug: string;
    cover_image: string | null;
    start_date: string;
    end_date?: string | null;
    yandex_map_url?: string | null;
    city?: { id: string; name: string } | null;
  } | null;
};

function normalizeTourJoin(raw: unknown): ParticipatedTourRow['tour'] {
  const tour = Array.isArray(raw) ? raw[0] : raw;
  if (!tour || typeof tour !== 'object') return null;
  const t = tour as Record<string, unknown>;
  if (typeof t.id !== 'string' || typeof t.title !== 'string' || typeof t.slug !== 'string') {
    return null;
  }
  const cityRaw = Array.isArray(t.city) ? t.city[0] : t.city;
  const city =
    cityRaw &&
    typeof cityRaw === 'object' &&
    typeof (cityRaw as { id?: unknown }).id === 'string' &&
    typeof (cityRaw as { name?: unknown }).name === 'string'
      ? { id: (cityRaw as { id: string }).id, name: (cityRaw as { name: string }).name }
      : null;

  return {
    id: t.id,
    title: t.title,
    slug: t.slug,
    cover_image: typeof t.cover_image === 'string' ? t.cover_image : null,
    start_date: typeof t.start_date === 'string' ? t.start_date : '',
    end_date: typeof t.end_date === 'string' ? t.end_date : null,
    yandex_map_url: typeof t.yandex_map_url === 'string' ? t.yandex_map_url : null,
    city,
  };
}

function sortParticipatedTours(rows: ParticipatedTourRow[]): ParticipatedTourRow[] {
  return [...rows].sort((a, b) => {
    const aTs = a.booking_date ? new Date(a.booking_date).getTime() : 0;
    const bTs = b.booking_date ? new Date(b.booking_date).getTime() : 0;
    return bTs - aTs;
  });
}

/** Туры пользователя: бронирования (confirmed/completed) + достижения с tour_id. */
export async function fetchUserParticipatedTours(
  client: SupabaseClient,
  userId: string
): Promise<ParticipatedTourRow[]> {
  const [bookingsRes, achievementsRes] = await Promise.all([
    client
      .from('bookings')
      .select(BOOKING_TOUR_SELECT)
      .eq('user_id', userId)
      .in('status', ['confirmed', 'completed'])
      .order('booking_date', { ascending: false }),
    client
      .from('achievements')
      .select(ACHIEVEMENT_TOUR_SELECT)
      .eq('user_id', userId)
      .not('tour_id', 'is', null)
      .order('unlock_date', { ascending: false }),
  ]);

  if (bookingsRes.error) {
    console.error('fetchUserParticipatedTours bookings:', bookingsRes.error);
  }
  if (achievementsRes.error) {
    console.error('fetchUserParticipatedTours achievements:', achievementsRes.error);
  }

  const byTourId = new Map<string, ParticipatedTourRow>();

  for (const row of bookingsRes.data ?? []) {
    const tourId = row.tour_id as string | null;
    const tour = normalizeTourJoin(row.tour);
    if (!tourId || !tour) continue;
    byTourId.set(tourId, {
      id: row.id as string,
      tour_id: tourId,
      status: (row.status as string) || 'confirmed',
      booking_date: (row.booking_date as string | null) ?? null,
      tour,
    });
  }

  for (const row of achievementsRes.data ?? []) {
    const tourId = row.tour_id as string | null;
    const tour = normalizeTourJoin(row.tour);
    if (!tourId || !tour || byTourId.has(tourId)) continue;
    byTourId.set(tourId, {
      id: `achievement-${row.id as string}`,
      tour_id: tourId,
      status: 'participated',
      booking_date: (row.unlock_date as string | null) ?? null,
      tour,
    });
  }

  return sortParticipatedTours(Array.from(byTourId.values()));
}

/** Уникальные туры: бронирования (confirmed/completed) + достижения с tour_id. */
export async function countUserParticipatedTours(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  const tours = await fetchUserParticipatedTours(client, userId);
  return tours.length;
}
