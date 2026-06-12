import type { SupabaseClient } from '@supabase/supabase-js';

import {
  findGuideScheduleConflict,
  GUIDE_BETWEEN_TOURS_BUFFER_MS,
  guideSessionsTooClose,
  loadBusyGuideSessions,
  type BusyGuideSession,
} from '@/lib/tour/guide-schedule-conflict';
import { sessionEndMs } from '@/lib/tour/schedule-slot';

export type AutoShiftResult = {
  start_at: string;
  end_at: string;
  duration_minutes: number;
};

/**
 * Подбирает ближайший слот для гида: та же длительность, зазор 60 мин от других туров.
 */
export function computeAutoShiftFromBusy(params: {
  originalStart: string;
  originalEnd: string | null;
  busy: BusyGuideSession[];
  guideId: string;
  sessionId: string;
  durationFallbackMinutes?: number;
}): AutoShiftResult | null {
  const durationFallback = params.durationFallbackMinutes ?? 180;
  const originalStartMs = new Date(params.originalStart).getTime();
  const originalEndMs = sessionEndMs(
    originalStartMs,
    params.originalEnd,
    durationFallback
  );
  const durationMs = Math.max(originalEndMs - originalStartMs, 60 * 60_000);

  let startMs = originalStartMs;

  for (let attempt = 0; attempt < 96 * 14; attempt++) {
    const endMs = startMs + durationMs;

    const conflict = findGuideScheduleConflict(
      params.busy,
      params.guideId,
      startMs,
      endMs,
      params.sessionId,
      durationFallback
    );

    if (!conflict) {
      return {
        start_at: new Date(startMs).toISOString(),
        end_at: new Date(endMs).toISOString(),
        duration_minutes: Math.round(durationMs / 60_000),
      };
    }

    let jumped = false;
    for (const row of params.busy) {
      if (row.guide_id !== params.guideId || row.id === params.sessionId) continue;
      const rowStart = new Date(row.start_at).getTime();
      const rowEnd = sessionEndMs(rowStart, row.end_at, durationFallback);
      if (!guideSessionsTooClose(startMs, endMs, rowStart, rowEnd)) continue;
      const nextStart = rowEnd + GUIDE_BETWEEN_TOURS_BUFFER_MS;
      if (nextStart > startMs) {
        startMs = nextStart;
        jumped = true;
        break;
      }
    }

    if (!jumped) {
      startMs += 15 * 60_000;
    }
  }

  return null;
}

export async function computeAutoShiftForSession(
  serviceClient: SupabaseClient,
  sessionId: string
): Promise<AutoShiftResult | null> {
  const { data: session, error } = await serviceClient
    .from('tour_sessions')
    .select('id, start_at, end_at, guide_id')
    .eq('id', sessionId)
    .single();

  if (error || !session) return null;

  const guideId = (session as { guide_id?: string | null }).guide_id;
  if (!guideId) return null;

  const start_at = (session as { start_at: string }).start_at;
  const end_at = (session as { end_at: string | null }).end_at ?? null;

  let durationFallback = 180;
  if (end_at) {
    const diff = new Date(end_at).getTime() - new Date(start_at).getTime();
    if (diff > 0) durationFallback = Math.round(diff / 60_000);
  }

  const busy = await loadBusyGuideSessions(serviceClient, new Date().toISOString());

  return computeAutoShiftFromBusy({
    originalStart: start_at,
    originalEnd: end_at,
    busy,
    guideId,
    sessionId,
    durationFallbackMinutes: durationFallback,
  });
}
