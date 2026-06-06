import type { SupabaseClient } from '@supabase/supabase-js';

/** Уникальные туры: бронирования (confirmed/completed) + достижения с tour_id. */
export async function countUserParticipatedTours(
  client: SupabaseClient,
  userId: string
): Promise<number> {
  const [bookingsRes, achievementsRes] = await Promise.all([
    client
      .from('bookings')
      .select('tour_id')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'completed']),
    client
      .from('achievements')
      .select('tour_id')
      .eq('user_id', userId)
      .not('tour_id', 'is', null),
  ]);

  const tourIds = new Set<string>();
  for (const row of bookingsRes.data ?? []) {
    if (row.tour_id) tourIds.add(row.tour_id as string);
  }
  for (const row of achievementsRes.data ?? []) {
    if (row.tour_id) tourIds.add(row.tour_id as string);
  }

  return tourIds.size;
}
