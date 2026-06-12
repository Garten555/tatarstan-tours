import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import {
  loadActiveGuideIds,
  loadTourAutoScheduleConfig,
} from '@/lib/tour/auto-schedule-settings';
import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { generateTourScheduleSlots } from '@/lib/tour/generate-auto-schedule';
import { loadBusyGuideSessions } from '@/lib/tour/guide-schedule-conflict';
import { syncTourSessions, type IncomingSession } from '@/lib/tour/sync-tour-sessions';

export type RunAutoScheduleResult =
  | {
      ok: true;
      applied: boolean;
      generated: ReturnType<typeof generateTourScheduleSlots>;
      tourTitle: string;
    }
  | { ok: false; status: number; error: string; details?: string };

export async function runAutoScheduleForTour(
  serviceClient: SupabaseClient,
  params: {
    tourId: string;
    actor: User;
    apply: boolean;
    configOverride?: Partial<TourAutoScheduleConfig>;
  }
): Promise<RunAutoScheduleResult> {
  const { tourId, actor, apply, configOverride } = params;

  const { data: tour, error: tourErr } = await serviceClient
    .from('tours')
    .select('id, title, status, start_date, end_date')
    .eq('id', tourId)
    .single();

  if (tourErr || !tour) {
    return { ok: false, status: 404, error: 'Тур не найден' };
  }

  const status = (tour as { status?: string }).status;

  const baseConfig = await loadTourAutoScheduleConfig(serviceClient);
  const config: TourAutoScheduleConfig = {
    ...baseConfig,
    ...configOverride,
  };

  if (tour.start_date && tour.end_date && !configOverride?.duration_minutes) {
    const startMs = new Date(tour.start_date as string).getTime();
    const endMs = new Date(tour.end_date as string).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      const mins = Math.round((endMs - startMs) / 60_000);
      if (mins >= 30 && mins <= 24 * 60) {
        config.duration_minutes = mins;
      }
    }
  }

  const { data: existing, error: sessErr } = await serviceClient
    .from('tour_sessions')
    .select('id, start_at, end_at, guide_id, status')
    .eq('tour_id', tourId)
    .order('start_at', { ascending: true });

  if (sessErr) {
    return {
      ok: false,
      status: 500,
      error: 'Не удалось прочитать слоты тура',
      details: sessErr.message,
    };
  }

  const existingSessions = (existing ?? []).map((r) => ({
    id: (r as { id: string }).id,
    start_at: (r as { start_at: string }).start_at,
    end_at: (r as { end_at: string | null }).end_at ?? null,
    guide_id: (r as { guide_id?: string | null }).guide_id ?? null,
  }));

  const guideIds = await loadActiveGuideIds(serviceClient);
  const busySessions = await loadBusyGuideSessions(
    serviceClient,
    new Date().toISOString()
  );

  const generated = generateTourScheduleSlots({
    config,
    existingSessions,
    guideIds,
    busySessions,
  });

  if (!apply) {
    return {
      ok: true,
      applied: false,
      generated,
      tourTitle: String((tour as { title?: string }).title || 'Тур'),
    };
  }

  if (generated.newSlots.length === 0) {
    return {
      ok: true,
      applied: false,
      generated,
      tourTitle: String((tour as { title?: string }).title || 'Тур'),
    };
  }

  const merged: IncomingSession[] = [
    ...existingSessions.map((s) => ({
      id: s.id,
      start_at: s.start_at,
      end_at: s.end_at,
      guide_id: s.guide_id ?? null,
    })),
    ...generated.newSlots.map((s) => ({
      start_at: s.start_at,
      end_at: s.end_at,
      guide_id: s.guide_id,
    })),
  ];

  const sync = await syncTourSessions(serviceClient, {
    tourId,
    sessions: merged,
    actor,
    durationMinutesForConflict: config.duration_minutes,
  });

  if (!sync.ok) {
    return {
      ok: false,
      status: sync.status,
      error: sync.error,
      details: sync.details,
    };
  }

  if (status === 'completed' || status === 'cancelled') {
    await serviceClient.from('tours').update({ status: 'active' }).eq('id', tourId);
  }

  return {
    ok: true,
    applied: true,
    generated,
    tourTitle: String((tour as { title?: string }).title || 'Тур'),
  };
}
