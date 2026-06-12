import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import { normalizeTourTimestampForStorage } from '@/lib/date/tour-timestamp';
import { sendTourRescheduleEmail } from '@/lib/email/tour-notifications';
import { assertGuideAvailable } from '@/lib/tour/guide-schedule-conflict';
import { publishCatalogChanged } from '@/lib/pusher/data-sync';
import type { SyncTourSessionsResult } from '@/lib/tour/sync-tour-sessions';

function isoNorm(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    return new Date(ts).toISOString();
  } catch {
    return ts;
  }
}

async function notifyReschedule(
  serviceClient: SupabaseClient,
  params: {
    sessionId: string;
    tourTitle: string;
    oldStart: string;
    oldEnd: string | null;
    newStart: string;
    newEnd: string | null;
  }
) {
  const { data: bookings } = await serviceClient
    .from('bookings')
    .select('user_id')
    .eq('session_id', params.sessionId)
    .in('status', ['pending', 'confirmed']);

  const userIds = [...new Set((bookings ?? []).map((b: { user_id: string }) => b.user_id))];
  if (userIds.length === 0) return;

  const { data: profiles } = await serviceClient.from('profiles').select('email').in('id', userIds);
  const emails = [...new Set((profiles ?? []).map((p: { email: string }) => p.email).filter(Boolean))];

  await Promise.allSettled(
    emails.map((to) =>
      sendTourRescheduleEmail({
        to,
        tourTitle: params.tourTitle,
        oldStart: params.oldStart,
        oldEnd: params.oldEnd,
        newStart: params.newStart,
        newEnd: params.newEnd,
      })
    )
  );
}

async function syncTourDateRange(serviceClient: SupabaseClient, tourId: string) {
  const { data: sessionTimes } = await serviceClient
    .from('tour_sessions')
    .select('start_at, end_at')
    .eq('tour_id', tourId)
    .order('start_at', { ascending: true });

  if (!sessionTimes?.length) return;

  const starts = sessionTimes.map((r) => r.start_at as string).filter(Boolean);
  const ends = sessionTimes
    .map((r) => (r.end_at as string | null) ?? null)
    .filter(Boolean) as string[];
  const start_date = starts[0];
  const end_date =
    ends.length > 0 ? ends.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b)) : null;

  await serviceClient.from('tours').update({ start_date, end_date }).eq('id', tourId);
}

export async function shiftTourSession(
  serviceClient: SupabaseClient,
  params: {
    sessionId: string;
    start_at: string;
    end_at?: string | null;
    actor: User;
  }
): Promise<SyncTourSessionsResult> {
  const start_at = normalizeTourTimestampForStorage(params.start_at) ?? params.start_at;
  const end_at =
    params.end_at != null && params.end_at !== ''
      ? normalizeTourTimestampForStorage(params.end_at) ?? params.end_at
      : null;

  if (!start_at) {
    return { ok: false, status: 400, error: 'Укажите время начала' };
  }

  const { data: session, error: loadErr } = await serviceClient
    .from('tour_sessions')
    .select('id, tour_id, start_at, end_at, guide_id')
    .eq('id', params.sessionId)
    .single();

  if (loadErr || !session) {
    return { ok: false, status: 404, error: 'Выезд не найден' };
  }

  const tourId = (session as { tour_id: string }).tour_id;
  const guideId = (session as { guide_id?: string | null }).guide_id ?? null;
  const prevStart = (session as { start_at: string }).start_at;
  const prevEnd = (session as { end_at: string | null }).end_at ?? null;

  const { data: tour } = await serviceClient
    .from('tours')
    .select('title')
    .eq('id', tourId)
    .single();

  const tourTitle = String((tour as { title?: string } | null)?.title || 'Тур');

  let durationMinutes = 180;
  if (prevEnd) {
    const diff = new Date(prevEnd).getTime() - new Date(prevStart).getTime();
    if (diff > 0) durationMinutes = Math.round(diff / 60_000);
  }

  const conflict = await assertGuideAvailable(serviceClient, {
    guideId,
    startAt: start_at,
    endAt: end_at,
    durationMinutes,
    excludeSessionId: params.sessionId,
    tourId,
  });

  if (!conflict.ok) {
    return { ok: false, status: 400, error: conflict.message };
  }

  const { error: upErr } = await serviceClient
    .from('tour_sessions')
    .update({ start_at, end_at })
    .eq('id', params.sessionId)
    .eq('tour_id', tourId);

  if (upErr) {
    console.error('[shift-tour-session]', upErr);
    return { ok: false, status: 500, error: 'Не удалось сохранить время', details: upErr.message };
  }

  const changed =
    isoNorm(prevStart) !== isoNorm(start_at) || isoNorm(prevEnd) !== isoNorm(end_at);

  if (changed) {
    const supersededAt = new Date().toISOString();
    const { data: sessionBookings } = await serviceClient
      .from('bookings')
      .select('id, departure_start_at, departure_end_at')
      .eq('session_id', params.sessionId)
      .in('status', ['pending', 'confirmed', 'completed']);

    for (const bookingRow of sessionBookings ?? []) {
      const row = bookingRow as {
        id: string;
        departure_start_at?: string | null;
        departure_end_at?: string | null;
      };
      const patch: Record<string, string> = { schedule_superseded_at: supersededAt };
      if (!row.departure_start_at) patch.departure_start_at = prevStart;
      if (!row.departure_end_at && prevEnd) patch.departure_end_at = prevEnd;
      await serviceClient.from('bookings').update(patch).eq('id', row.id);
    }

    void notifyReschedule(serviceClient, {
      sessionId: params.sessionId,
      tourTitle,
      oldStart: prevStart,
      oldEnd: prevEnd,
      newStart: start_at,
      newEnd: end_at,
    });
  }

  await syncTourDateRange(serviceClient, tourId);
  void publishCatalogChanged();

  return { ok: true };
}
