import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import { assertGuideAvailable } from '@/lib/tour/guide-schedule-conflict';
import { ensureTourRoomForSession } from '@/lib/tour/ensure-session-room';
import { syncSessionCurrentParticipants } from '@/lib/tour/session-participants';
import { sendTourRescheduleEmail, formatRuDateTime } from '@/lib/email/tour-notifications';
import { publishCatalogChanged } from '@/lib/pusher/data-sync';
import { publishUserNotification } from '@/lib/pusher/user-notification';
import { normalizeTourTimestampForStorage } from '@/lib/date/tour-timestamp';

export type IncomingSession = {
  id?: string;
  start_at: string;
  end_at?: string | null;
  guide_id?: string | null;
};

function isoNorm(ts: string | null | undefined): string {
  if (!ts) return '';
  try {
    return new Date(ts).toISOString();
  } catch {
    return ts;
  }
}

function scheduleRescheduleEmails(
  serviceClient: SupabaseClient,
  items: Array<{
    sessionId: string;
    oldStart: string;
    oldEnd: string | null;
    newStart: string;
    newEnd: string | null;
  }>,
  tourTitle: string
) {
  void (async () => {
    try {
      for (const item of items) {
        const { data: bookings } = await serviceClient
          .from('bookings')
          .select('user_id')
          .eq('session_id', item.sessionId)
          .in('status', ['pending', 'confirmed']);
        const userIds = [...new Set((bookings ?? []).map((b: { user_id: string }) => b.user_id))];
        if (userIds.length === 0) continue;

        const oldLabel = formatRuDateTime(item.oldStart);
        const newLabel = formatRuDateTime(item.newStart);
        const notifBody = `Тур «${tourTitle}»: выезд перенесён с ${oldLabel} на ${newLabel}`;

        for (const userId of userIds) {
          try {
            const { data: notifRow, error: notifErr } = await serviceClient
              .from('notifications')
              .insert({
                user_id: userId,
                title: 'Перенос тура',
                body: notifBody,
                type: 'tour_reschedule',
              })
              .select('id, user_id, title, body, type, created_at')
              .single();

            if (notifErr) {
              console.error('[sessions/sync] reschedule notification', notifErr);
            } else if (notifRow) {
              await publishUserNotification(userId, notifRow);
            }
          } catch (notifEx) {
            console.error('[sessions/sync] reschedule notification user', userId, notifEx);
          }
        }

        const { data: profiles } = await serviceClient.from('profiles').select('email').in('id', userIds);
        const emails = [...new Set((profiles ?? []).map((p: { email: string }) => p.email).filter(Boolean))];
        await Promise.allSettled(
          emails.map((to) =>
            sendTourRescheduleEmail({
              to,
              tourTitle,
              oldStart: item.oldStart,
              oldEnd: item.oldEnd,
              newStart: item.newStart,
              newEnd: item.newEnd,
            })
          )
        );
      }
    } catch (e) {
      console.error('[sessions/sync] reschedule emails', e);
    }
  })();
}

export type SyncTourSessionsResult =
  | { ok: true }
  | { ok: false; status: number; error: string; details?: string };

export async function syncTourSessions(
  serviceClient: SupabaseClient,
  params: {
    tourId: string;
    sessions: IncomingSession[];
    actor: User;
    durationMinutesForConflict?: number;
  }
): Promise<SyncTourSessionsResult> {
  const { tourId, sessions, actor } = params;
  const durationMinutes = params.durationMinutesForConflict ?? 180;

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { ok: false, status: 400, error: 'Передайте массив sessions с хотя бы одним выездом' };
  }

  const { data: tour, error: tourErr } = await serviceClient
    .from('tours')
    .select('id, max_participants, title')
    .eq('id', tourId)
    .single();

  if (tourErr || !tour) {
    return { ok: false, status: 404, error: 'Тур не найден' };
  }

  const maxP = (tour as { max_participants: number }).max_participants;
  const tourTitle = String((tour as { title?: string }).title || 'Тур');

  const { data: existing, error: exErr } = await serviceClient
    .from('tour_sessions')
    .select('id, start_at, end_at')
    .eq('tour_id', tourId);

  const guideColumnMissing = (msg: string) =>
    /guide_id|schema cache|column/i.test(msg);

  if (exErr) {
    console.error('[sessions/sync]', exErr);
    return {
      ok: false,
      status: 500,
      error:
        'Не удалось прочитать tour_sessions. Выполните миграции tour_sessions в Supabase.',
      details: exErr.message,
    };
  }

  const existingRows = existing ?? [];
  const previousById = new Map(
    existingRows.map((r) => [
      r.id,
      { start_at: r.start_at as string, end_at: (r.end_at as string | null) ?? null },
    ])
  );
  const rescheduleNotify: Array<{
    sessionId: string;
    oldStart: string;
    oldEnd: string | null;
    newStart: string;
    newEnd: string | null;
  }> = [];

  const incomingIds = new Set(sessions.map((s) => s.id).filter(Boolean) as string[]);

  for (const row of existingRows) {
    if (incomingIds.has(row.id)) continue;
    const { count, error: cntErr } = await serviceClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', row.id);
    if (cntErr) continue;
    if ((count ?? 0) > 0) continue;
    await serviceClient.from('tour_sessions').delete().eq('id', row.id);
  }

  const normalizeGuideId = (v: unknown): string | null => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'string') return v;
    return null;
  };

  for (const s of sessions) {
    const start_at = normalizeTourTimestampForStorage(s.start_at) ?? s.start_at;
    const end_at =
      s.end_at != null && s.end_at !== ''
        ? normalizeTourTimestampForStorage(s.end_at) ?? s.end_at
        : null;
    const guide_id = normalizeGuideId(s.guide_id);
    if (!start_at) {
      return { ok: false, status: 400, error: 'У каждого слота нужна start_at' };
    }

    const knownId = s.id && existingRows.some((r) => r.id === s.id);
    const conflict = await assertGuideAvailable(serviceClient, {
      guideId: guide_id,
      startAt: start_at,
      endAt: end_at,
      durationMinutes,
      excludeSessionId: knownId ? s.id : undefined,
      tourId,
    });
    if (!conflict.ok) {
      return { ok: false, status: 400, error: conflict.message };
    }

    if (knownId && s.id) {
      const updatePayload: Record<string, unknown> = {
        start_at,
        end_at,
        max_participants: maxP,
        guide_id,
      };
      let { error: upErr } = await serviceClient
        .from('tour_sessions')
        .update(updatePayload)
        .eq('id', s.id)
        .eq('tour_id', tourId);

      if (upErr && guideColumnMissing(upErr.message ?? '')) {
        delete updatePayload.guide_id;
        upErr = (
          await serviceClient
            .from('tour_sessions')
            .update(updatePayload)
            .eq('id', s.id)
            .eq('tour_id', tourId)
        ).error;
      }

      if (upErr) {
        console.error('[sessions/sync] update', upErr);
        return {
          ok: false,
          status: 500,
          error: 'Не удалось обновить слот',
          details: upErr.message,
        };
      }

      const prev = previousById.get(s.id);
      if (prev) {
        const changed =
          isoNorm(prev.start_at) !== isoNorm(start_at) ||
          isoNorm(prev.end_at) !== isoNorm(end_at);
        if (changed) {
          rescheduleNotify.push({
            sessionId: s.id,
            oldStart: prev.start_at,
            oldEnd: prev.end_at,
            newStart: start_at,
            newEnd: end_at,
          });

          const supersededAt = new Date().toISOString();
          const { data: sessionBookings } = await serviceClient
            .from('bookings')
            .select('id, departure_start_at, departure_end_at')
            .eq('session_id', s.id)
            .in('status', ['pending', 'confirmed', 'completed']);

          for (const bookingRow of sessionBookings ?? []) {
            const row = bookingRow as {
              id: string;
              departure_start_at?: string | null;
              departure_end_at?: string | null;
            };
            const patch: Record<string, string> = {
              schedule_superseded_at: supersededAt,
            };
            if (!row.departure_start_at) {
              patch.departure_start_at = prev.start_at;
            }
            if (!row.departure_end_at && prev.end_at) {
              patch.departure_end_at = prev.end_at;
            }
            await serviceClient.from('bookings').update(patch).eq('id', row.id);
          }
        }
      }
    } else {
      const insertPayload: Record<string, unknown> = {
        tour_id: tourId,
        start_at,
        end_at,
        max_participants: maxP,
        current_participants: 0,
        status: 'active',
        guide_id,
      };
      let { error: insErr } = await serviceClient.from('tour_sessions').insert(insertPayload);
      if (insErr && guideColumnMissing(insErr.message ?? '')) {
        delete insertPayload.guide_id;
        insErr = (await serviceClient.from('tour_sessions').insert(insertPayload)).error;
      }
      if (insErr) {
        console.error('[sessions/sync] insert', insErr);
        return {
          ok: false,
          status: 500,
          error: 'Не удалось добавить слот',
          details: insErr.message,
        };
      }
    }
  }

  const { data: sessionsAfter, error: sessAfterErr } = await serviceClient
    .from('tour_sessions')
    .select('id, guide_id')
    .eq('tour_id', tourId);

  if (!sessAfterErr && sessionsAfter?.length) {
    for (const row of sessionsAfter) {
      const sid = (row as { id: string }).id;
      const gid = (row as { guide_id?: string | null }).guide_id ?? null;
      const res = await ensureTourRoomForSession(serviceClient, {
        tourId,
        sessionId: sid,
        guideId: gid,
        createdBy: actor.id,
      });
      if (!res.ok && !/relation|column|schema/i.test(res.error ?? '')) {
        console.warn('[sessions/sync] ensure room', sid, res.error);
      }
    }
  }

  if (rescheduleNotify.length > 0) {
    scheduleRescheduleEmails(serviceClient, rescheduleNotify, tourTitle);
  }

  const { data: sessionsFinal } = await serviceClient
    .from('tour_sessions')
    .select('id')
    .eq('tour_id', tourId);
  if (sessionsFinal?.length) {
    await Promise.all(
      sessionsFinal.map((row) =>
        syncSessionCurrentParticipants(serviceClient, (row as { id: string }).id)
      )
    );
  }

  void publishCatalogChanged();

  const { data: sessionTimes } = await serviceClient
    .from('tour_sessions')
    .select('start_at, end_at')
    .eq('tour_id', tourId)
    .order('start_at', { ascending: true });

  if (sessionTimes?.length) {
    const starts = sessionTimes.map((r) => r.start_at as string).filter(Boolean);
    const ends = sessionTimes
      .map((r) => (r.end_at as string | null) ?? null)
      .filter(Boolean) as string[];
    const start_date = starts[0];
    const end_date =
      ends.length > 0
        ? ends.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b))
        : null;
    await serviceClient.from('tours').update({ start_date, end_date }).eq('id', tourId);
  }

  return { ok: true };
}
