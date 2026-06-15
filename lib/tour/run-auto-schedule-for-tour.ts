import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import {
  loadActiveGuideIds,
  loadTourAutoScheduleConfig,
} from '@/lib/tour/auto-schedule-settings';
import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { normalizeTourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { generateTourScheduleSlots } from '@/lib/tour/generate-auto-schedule';
import {
  generateMonthTourScheduleSlots,
  parseTargetMonth,
  sessionInTargetMonth,
  type MonthScheduleMode,
} from '@/lib/tour/month-schedule';
import {
  currentMonthKey,
  resolveMonthsForAutoSchedule,
  type MonthScheduleScope,
} from '@/lib/tour/month-schedule-scope';
import { loadBusyGuideSessions } from '@/lib/tour/guide-schedule-conflict';
import { syncTourSessions, type IncomingSession } from '@/lib/tour/sync-tour-sessions';
import { syncTourCatalogDatesFromSessions } from '@/lib/tour/sync-tour-dates-from-sessions';
import { prunePastTourSessionsWithoutBookings } from '@/lib/tour/prune-past-tour-sessions';

export type RunAutoScheduleResult =
  | {
      ok: true;
      applied: boolean;
      generated: ReturnType<typeof generateTourScheduleSlots> & {
        rescheduledBooked?: number;
        removedEmpty?: number;
        monthsProcessed?: string[];
      };
      tourTitle: string;
      catalogDatesUpdated?: boolean;
    }
  | { ok: false; status: number; error: string; details?: string };

async function loadTourSessions(
  serviceClient: SupabaseClient,
  tourId: string
) {
  const { data: existing, error: sessErr } = await serviceClient
    .from('tour_sessions')
    .select('id, start_at, end_at, guide_id, status')
    .eq('tour_id', tourId)
    .order('start_at', { ascending: true });

  if (sessErr) {
    return { ok: false as const, error: sessErr.message };
  }

  const existingSessions = (existing ?? [])
    .filter((r) => (r as { status?: string }).status !== 'cancelled')
    .map((r) => ({
      id: (r as { id: string }).id,
      start_at: (r as { start_at: string }).start_at,
      end_at: (r as { end_at: string | null }).end_at ?? null,
      guide_id: (r as { guide_id?: string | null }).guide_id ?? null,
      status: (r as { status?: string }).status,
    }));

  return { ok: true as const, existingSessions };
}

async function loadBookedSessionIdsInMonth(
  serviceClient: SupabaseClient,
  existingSessions: Array<{ id?: string; start_at: string }>,
  year: number,
  month: number
): Promise<Set<string>> {
  const bookedSessionIds = new Set<string>();
  const inMonthIds = existingSessions
    .filter((s) => s.id && sessionInTargetMonth(s.start_at, year, month))
    .map((s) => s.id as string);

  if (inMonthIds.length === 0) return bookedSessionIds;

  const { data: bookedRows } = await serviceClient
    .from('bookings')
    .select('session_id')
    .in('session_id', inMonthIds)
    .in('status', ['pending', 'confirmed']);

  for (const row of bookedRows ?? []) {
    const sid = (row as { session_id: string }).session_id;
    if (sid) bookedSessionIds.add(sid);
  }

  return bookedSessionIds;
}

async function finalizeAutoScheduleApply(
  serviceClient: SupabaseClient,
  tourId: string
): Promise<{ catalogDatesUpdated: boolean; prunedSessions: number }> {
  const pruned = await prunePastTourSessionsWithoutBookings(serviceClient, {
    tourIds: [tourId],
  });
  const datesSync = await syncTourCatalogDatesFromSessions(serviceClient, tourId);
  return {
    catalogDatesUpdated: datesSync.updated,
    prunedSessions: pruned.sessionsRemoved,
  };
}

export async function runAutoScheduleForTour(
  serviceClient: SupabaseClient,
  params: {
    tourId: string;
    actor: User;
    apply: boolean;
    configOverride?: Partial<TourAutoScheduleConfig>;
    targetMonth?: string;
    monthMode?: MonthScheduleMode;
    monthScope?: MonthScheduleScope;
  }
): Promise<RunAutoScheduleResult> {
  const {
    tourId,
    actor,
    apply,
    configOverride,
    targetMonth,
    monthMode = 'fill',
    monthScope = 'single',
  } = params;

  const { data: tour, error: tourErr } = await serviceClient
    .from('tours')
    .select('id, title, status, start_date, end_date')
    .eq('id', tourId)
    .single();

  if (tourErr || !tour) {
    return { ok: false, status: 404, error: 'Тур не найден' };
  }

  const baseConfig = await loadTourAutoScheduleConfig(serviceClient);
  const config: TourAutoScheduleConfig = normalizeTourAutoScheduleConfig({
    ...baseConfig,
    ...configOverride,
  });

  const templateFromClient =
    Boolean(configOverride?.start_times?.length) ||
    Boolean(configOverride?.duration_minutes);

  if (tour.start_date && tour.end_date && !templateFromClient) {
    const startMs = new Date(tour.start_date as string).getTime();
    const endMs = new Date(tour.end_date as string).getTime();
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      const mins = Math.round((endMs - startMs) / 60_000);
      if (mins >= 30 && mins <= 24 * 60) {
        config.duration_minutes = mins;
      }
    }
  }

  const loaded = await loadTourSessions(serviceClient, tourId);
  if (!loaded.ok) {
    return {
      ok: false,
      status: 500,
      error: 'Не удалось прочитать слоты тура',
      details: loaded.error,
    };
  }

  let existingSessions = loaded.existingSessions;
  const guideIds = await loadActiveGuideIds(serviceClient);
  let busySessions = await loadBusyGuideSessions(
    serviceClient,
    new Date().toISOString()
  );

  const anchorMonth = targetMonth?.trim() || currentMonthKey();
  const monthsToProcess =
    monthScope === 'all_scheduled' || targetMonth
      ? resolveMonthsForAutoSchedule({
          scope: monthScope,
          anchorMonth,
          existingSessions,
          horizonDays: config.horizon_days,
        })
      : [];

  if (monthsToProcess.length > 0) {
    let totalNewSlots: ReturnType<typeof generateMonthTourScheduleSlots>['newSlots'] = [];
    let rescheduledBooked = 0;
    let removedEmpty = 0;
    let appliedAny = false;

    for (const monthKey of monthsToProcess) {
      const monthParsed = parseTargetMonth(monthKey);
      if (!monthParsed) continue;

      const bookedSessionIds =
        monthMode === 'regenerate'
          ? await loadBookedSessionIdsInMonth(
              serviceClient,
              existingSessions,
              monthParsed.year,
              monthParsed.month
            )
          : new Set<string>();

      const monthResult = generateMonthTourScheduleSlots({
        config,
        existingSessions,
        guideIds,
        busySessions,
        year: monthParsed.year,
        month: monthParsed.month,
        mode: monthMode,
        bookedSessionIds,
      });

      totalNewSlots = [...totalNewSlots, ...monthResult.newSlots];
      rescheduledBooked += monthResult.rescheduledBooked;
      removedEmpty += monthResult.removedEmpty;

      if (!apply) continue;

      const monthUnchanged =
        monthResult.newSlots.length === 0 &&
        monthResult.rescheduledBooked === 0 &&
        monthResult.removedEmpty === 0 &&
        monthMode === 'fill';

      if (monthUnchanged) continue;

      const sync = await syncTourSessions(serviceClient, {
        tourId,
        sessions: monthResult.mergedSessions,
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

      appliedAny = true;

      const reloaded = await loadTourSessions(serviceClient, tourId);
      if (reloaded.ok) {
        existingSessions = reloaded.existingSessions;
      }
      busySessions = await loadBusyGuideSessions(
        serviceClient,
        new Date().toISOString()
      );
    }

    const generated = {
      newSlots: totalNewSlots,
      existingFutureCount: existingSessions.filter(
        (s) => new Date(s.start_at).getTime() > Date.now()
      ).length,
      targetSlots: config.slots_ahead,
      skippedNoGuide: 0,
      skippedDuplicate: 0,
      rescheduledBooked,
      removedEmpty,
      monthsProcessed: monthsToProcess,
      zeroReason:
        totalNewSlots.length === 0 &&
        rescheduledBooked === 0 &&
        removedEmpty === 0 &&
        monthMode === 'fill'
          ? ('no_free_days' as const)
          : undefined,
    };

    if (!apply) {
      return {
        ok: true,
        applied: false,
        generated,
        tourTitle: String((tour as { title?: string }).title || 'Тур'),
      };
    }

    if (!appliedAny) {
      return {
        ok: true,
        applied: false,
        generated,
        tourTitle: String((tour as { title?: string }).title || 'Тур'),
      };
    }

    const datesSync = await finalizeAutoScheduleApply(serviceClient, tourId);

    return {
      ok: true,
      applied: true,
      generated,
      tourTitle: String((tour as { title?: string }).title || 'Тур'),
      catalogDatesUpdated: datesSync.catalogDatesUpdated,
    };
  }

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

  const datesSync = await finalizeAutoScheduleApply(serviceClient, tourId);

  return {
    ok: true,
    applied: true,
    generated,
    tourTitle: String((tour as { title?: string }).title || 'Тур'),
    catalogDatesUpdated: datesSync.catalogDatesUpdated,
  };
}
