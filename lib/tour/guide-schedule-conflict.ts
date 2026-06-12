import type { SupabaseClient } from '@supabase/supabase-js';

import { intervalsOverlap, sessionEndMs } from '@/lib/tour/schedule-slot';

/** Минимальный зазор между турами одного гида (дорога, сбор группы). */
export const GUIDE_BETWEEN_TOURS_BUFFER_MINUTES = 60;
export const GUIDE_BETWEEN_TOURS_BUFFER_MS = GUIDE_BETWEEN_TOURS_BUFFER_MINUTES * 60_000;

export type BusyGuideSession = {
  id: string;
  guide_id: string;
  start_at: string;
  end_at: string | null;
  tour_id?: string;
};

export type GuideScheduleIssue = 'overlap' | 'buffer';

export type GuideScheduleConflictDetail = {
  issue: GuideScheduleIssue;
  other_session_id: string;
  /** Положительный — пауза между турами; отрицательный — пересечение в минутах. */
  gap_minutes: number;
};

/** Слишком близко или пересекается с учётом буфера между турами. */
export function guideSessionsTooClose(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  bufferMs: number = GUIDE_BETWEEN_TOURS_BUFFER_MS
): boolean {
  return !(aEnd + bufferMs <= bStart || bEnd + bufferMs <= aStart);
}

export function guideHasConflict(
  busy: BusyGuideSession[],
  guideId: string,
  startMs: number,
  endMs: number,
  excludeSessionId?: string,
  bufferMs: number = GUIDE_BETWEEN_TOURS_BUFFER_MS
): boolean {
  return findGuideScheduleConflict(
    busy,
    guideId,
    startMs,
    endMs,
    excludeSessionId,
    180,
    bufferMs
  ) != null;
}

export function findGuideScheduleConflict(
  busy: BusyGuideSession[],
  guideId: string,
  startMs: number,
  endMs: number,
  excludeSessionId?: string,
  durationFallbackMinutes = 180,
  bufferMs: number = GUIDE_BETWEEN_TOURS_BUFFER_MS
): GuideScheduleConflictDetail | null {
  for (const row of busy) {
    if (row.guide_id !== guideId) continue;
    if (excludeSessionId && row.id === excludeSessionId) continue;

    const rowStart = new Date(row.start_at).getTime();
    const rowEnd = sessionEndMs(rowStart, row.end_at, durationFallbackMinutes);

    const overlaps = intervalsOverlap(startMs, endMs, rowStart, rowEnd);
    const tooClose = guideSessionsTooClose(startMs, endMs, rowStart, rowEnd, bufferMs);

    if (!overlaps && !tooClose) continue;

    let gapMinutes: number;
    if (endMs <= rowStart) {
      gapMinutes = Math.round((rowStart - endMs) / 60_000);
    } else if (rowEnd <= startMs) {
      gapMinutes = Math.round((startMs - rowEnd) / 60_000);
    } else {
      const overlapMs = Math.min(endMs, rowEnd) - Math.max(startMs, rowStart);
      gapMinutes = -Math.round(overlapMs / 60_000);
    }

    return {
      issue: overlaps ? 'overlap' : 'buffer',
      other_session_id: row.id,
      gap_minutes: gapMinutes,
    };
  }

  return null;
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

  const conflict = findGuideScheduleConflict(
    busy,
    params.guideId,
    startMs,
    endMs,
    params.excludeSessionId,
    params.durationMinutes
  );

  if (conflict) {
    if (conflict.issue === 'overlap') {
      return {
        ok: false,
        message:
          'Гид уже занят на это время (пересечение с другим туром). Выберите другое время или другого гида.',
      };
    }
    return {
      ok: false,
      message: `Слишком мало времени между турами гида (${conflict.gap_minutes} мин, нужно минимум ${GUIDE_BETWEEN_TOURS_BUFFER_MINUTES} мин). Сдвиньте время или назначьте другого гида.`,
    };
  }

  return { ok: true };
}

export function scheduleIssueMessage(
  issue: GuideScheduleIssue,
  gapMinutes: number
): string {
  if (issue === 'overlap') {
    return gapMinutes < 0
      ? `Пересечение с другим туром на ${Math.abs(gapMinutes)} мин`
      : 'Пересечение по времени с другим туром';
  }
  return `Между турами только ${gapMinutes} мин — нужно минимум ${GUIDE_BETWEEN_TOURS_BUFFER_MINUTES} мин`;
}
