import type { SupabaseClient } from '@supabase/supabase-js';

import { intervalsOverlap, sessionEndMs } from '@/lib/tour/schedule-slot';

export type BusyGuideSession = {
  id: string;
  guide_id: string;
  start_at: string;
  end_at: string | null;
  tour_id?: string;
};

export function guideHasConflict(
  busy: BusyGuideSession[],
  guideId: string,
  startMs: number,
  endMs: number,
  excludeSessionId?: string
): boolean {
  return busy.some((row) => {
    if (row.guide_id !== guideId) return false;
    if (excludeSessionId && row.id === excludeSessionId) return false;
    const rowStart = new Date(row.start_at).getTime();
    const rowEnd = sessionEndMs(rowStart, row.end_at, 180);
    return intervalsOverlap(startMs, endMs, rowStart, rowEnd);
  });
}

export async function loadBusyGuideSessions(
  serviceClient: SupabaseClient,
  nowIso: string
): Promise<BusyGuideSession[]> {
  const { data, error } = await serviceClient
    .from('tour_sessions')
    .select('id, guide_id, start_at, end_at, tour_id, status')
    .not('guide_id', 'is', null)
    .gte('start_at', new Date(new Date(nowIso).getTime() - 86_400_000).toISOString())
    .neq('status', 'cancelled');

  if (error) {
    if (/guide_id|schema cache|column/i.test(error.message)) return [];
    throw error;
  }

  return (data ?? [])
    .filter((r) => (r as { guide_id?: string | null }).guide_id)
    .map((r) => ({
      id: (r as { id: string }).id,
      guide_id: (r as { guide_id: string }).guide_id,
      start_at: (r as { start_at: string }).start_at,
      end_at: (r as { end_at: string | null }).end_at ?? null,
      tour_id: (r as { tour_id?: string }).tour_id,
    }));
}

export async function assertGuideAvailable(
  serviceClient: SupabaseClient,
  params: {
    guideId: string | null;
    startAt: string;
    endAt: string | null;
    durationMinutes: number;
    excludeSessionId?: string;
    tourId?: string;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!params.guideId) return { ok: true };

  const startMs = new Date(params.startAt).getTime();
  const endMs = sessionEndMs(startMs, params.endAt, params.durationMinutes);
  const busy = await loadBusyGuideSessions(serviceClient, new Date().toISOString());

  if (
    guideHasConflict(
      busy,
      params.guideId,
      startMs,
      endMs,
      params.excludeSessionId
    )
  ) {
    return {
      ok: false,
      message:
        'Гид уже занят на это время (другой тур или выезд). Выберите другое время или другого гида.',
    };
  }

  return { ok: true };
}
