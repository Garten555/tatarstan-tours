import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeTourTimestampForStorage, parseTourTimestampMs } from '@/lib/date/tour-timestamp';
import { publishCatalogChanged } from '@/lib/pusher/data-sync';
import { LEGACY_TOUR_SESSION_ID } from '@/lib/tour/legacy-session';
import { filterUpcomingSessions } from '@/lib/tours/tour-public-visibility';

type SessionRow = { id: string; start_at: string; end_at: string | null };

async function loadActiveSessions(
  serviceClient: SupabaseClient,
  tourId: string
): Promise<SessionRow[]> {
  const { data, error } = await serviceClient
    .from('tour_sessions')
    .select('id, start_at, end_at')
    .eq('tour_id', tourId)
    .eq('status', 'active')
    .order('start_at', { ascending: true });

  if (error) {
    console.error('[syncTourCatalogDates] load sessions', error);
    return [];
  }

  return (data ?? []).filter((r) => (r as { id: string }).id !== LEGACY_TOUR_SESSION_ID) as SessionRow[];
}

/**
 * После авторасписания: активный тур, start_date/end_date по ближайшим будущим выездам.
 * Без ручного редактирования карточки тура.
 */
export async function syncTourCatalogDatesFromSessions(
  serviceClient: SupabaseClient,
  tourId: string
): Promise<{ updated: boolean; start_date?: string; end_date?: string }> {
  const sessions = await loadActiveSessions(serviceClient, tourId);
  const upcoming = filterUpcomingSessions(sessions, new Date());

  if (upcoming.length === 0) {
    return { updated: false };
  }

  const sorted = [...upcoming].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const firstStart = sorted[0].start_at;
  const last = sorted[sorted.length - 1];
  const lastEnd =
    last.end_at && parseTourTimestampMs(last.end_at) != null ? last.end_at : last.start_at;

  const start_date = normalizeTourTimestampForStorage(firstStart) ?? firstStart;
  const end_date = normalizeTourTimestampForStorage(lastEnd) ?? lastEnd;

  const { error } = await serviceClient
    .from('tours')
    .update({
      status: 'active',
      start_date,
      end_date,
    })
    .eq('id', tourId);

  if (error) {
    console.error('[syncTourCatalogDates] update tour', error);
    return { updated: false };
  }

  void publishCatalogChanged();
  return { updated: true, start_date, end_date };
}
