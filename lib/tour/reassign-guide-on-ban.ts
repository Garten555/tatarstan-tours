import type { SupabaseClient } from '@supabase/supabase-js';

import { loadActiveGuideIds } from '@/lib/tour/auto-schedule-settings';
import { ensureTourRoomForSession } from '@/lib/tour/ensure-session-room';
import {
  loadBusyGuideSessions,
  type BusyGuideSession,
} from '@/lib/tour/guide-schedule-conflict';
import { pickAvailableGuide } from '@/lib/tour/pick-available-guide';
import { publishCatalogChanged } from '@/lib/pusher/data-sync';
import { syncGuideRoomParticipant } from '@/lib/tour-rooms/sync-guide-participant';
import { sessionEndMs } from '@/lib/tour/schedule-slot';

export type ReassignGuideOnBanResult = {
  sessionsReassigned: number;
  sessionsUnassigned: number;
  roomsCleared: number;
};

type SessionRow = {
  id: string;
  tour_id: string;
  start_at: string;
  end_at: string | null;
};

function upsertBusySlot(
  busy: BusyGuideSession[],
  row: { id: string; guide_id: string; start_at: string; end_at: string | null; tour_id: string }
) {
  const idx = busy.findIndex((b) => b.id === row.id);
  const entry: BusyGuideSession = {
    id: row.id,
    guide_id: row.guide_id,
    start_at: row.start_at,
    end_at: row.end_at,
    tour_id: row.tour_id,
  };
  if (idx >= 0) busy[idx] = entry;
  else busy.push(entry);
}

function removeBusySlot(busy: BusyGuideSession[], sessionId: string) {
  const idx = busy.findIndex((b) => b.id === sessionId);
  if (idx >= 0) busy.splice(idx, 1);
}

/**
 * При бане гида переназначает его будущие выезды на свободных гидов по графику.
 * Если свободного нет — выезд остаётся без гида (видно в админке как «Без гида»).
 */
export async function reassignGuideWorkOnBan(
  serviceClient: SupabaseClient,
  bannedGuideId: string,
  actorUserId: string
): Promise<ReassignGuideOnBanResult> {
  const nowIso = new Date().toISOString();
  let sessionsReassigned = 0;
  let sessionsUnassigned = 0;
  let roomsCleared = 0;

  const guideIds = (await loadActiveGuideIds(serviceClient)).filter(
    (id) => id !== bannedGuideId
  );

  const { data: sessionsRaw, error: sessErr } = await serviceClient
    .from('tour_sessions')
    .select('id, tour_id, start_at, end_at')
    .eq('guide_id', bannedGuideId)
    .neq('status', 'cancelled')
    .neq('status', 'completed')
    .gte('start_at', nowIso)
    .order('start_at', { ascending: true });

  if (sessErr) {
    if (/guide_id|schema cache|column/i.test(sessErr.message)) {
      return { sessionsReassigned: 0, sessionsUnassigned: 0, roomsCleared: 0 };
    }
    throw sessErr;
  }

  const sessions = (sessionsRaw ?? []) as SessionRow[];
  const busy = await loadBusyGuideSessions(serviceClient, nowIso);

  for (const session of sessions) {
    const startMs = new Date(session.start_at).getTime();
    const endMs = sessionEndMs(startMs, session.end_at, 180);

    const newGuideId = pickAvailableGuide(guideIds, busy, startMs, endMs, {
      excludeSessionId: session.id,
      excludeGuideIds: [bannedGuideId],
    });

    const { error: upErr } = await serviceClient
      .from('tour_sessions')
      .update({ guide_id: newGuideId })
      .eq('id', session.id);

    if (upErr) {
      console.error('[reassign-guide-on-ban] session', session.id, upErr);
      continue;
    }

    if (newGuideId) {
      sessionsReassigned += 1;
      upsertBusySlot(busy, {
        id: session.id,
        guide_id: newGuideId,
        start_at: session.start_at,
        end_at: session.end_at,
        tour_id: session.tour_id,
      });
    } else {
      sessionsUnassigned += 1;
      removeBusySlot(busy, session.id);
    }

    const roomRes = await ensureTourRoomForSession(serviceClient, {
      tourId: session.tour_id,
      sessionId: session.id,
      guideId: newGuideId,
      createdBy: actorUserId,
    });
    if (!roomRes.ok) {
      console.warn('[reassign-guide-on-ban] room', session.id, roomRes.error);
    }
  }

  const { data: orphanRooms } = await serviceClient
    .from('tour_rooms')
    .select('id, guide_id')
    .eq('guide_id', bannedGuideId);

  for (const room of orphanRooms ?? []) {
    const roomId = (room as { id: string }).id;
    const prevGuide = (room as { guide_id: string }).guide_id;
    const { error: upRoomErr } = await serviceClient
      .from('tour_rooms')
      .update({ guide_id: null })
      .eq('id', roomId);
    if (upRoomErr) continue;
    await syncGuideRoomParticipant(serviceClient, roomId, null, prevGuide);
    roomsCleared += 1;
  }

  if (sessionsReassigned > 0 || sessionsUnassigned > 0 || roomsCleared > 0) {
    void publishCatalogChanged();
  }

  return { sessionsReassigned, sessionsUnassigned, roomsCleared };
}
