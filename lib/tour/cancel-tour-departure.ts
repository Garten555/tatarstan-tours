import type { SupabaseClient } from '@supabase/supabase-js';

import { sendTourCancelledEmail } from '@/lib/email/tour-notifications';
import { formatSessionRange } from '@/lib/tour/session-display';
import { publishCatalogChanged } from '@/lib/pusher/data-sync';

async function recalcTourDatesFromSessions(
  serviceClient: SupabaseClient,
  tourId: string
): Promise<void> {
  const { data: sessionTimes } = await serviceClient
    .from('tour_sessions')
    .select('start_at, end_at')
    .eq('tour_id', tourId)
    .eq('status', 'active')
    .order('start_at', { ascending: true });

  if (!sessionTimes?.length) return;

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

async function collectParticipantEmails(
  serviceClient: SupabaseClient,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return [];

  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('email')
    .in('id', userIds);

  return [...new Set((profiles || []).map((p) => p.email).filter(Boolean))];
}

export async function cancelTourDepartures(
  serviceClient: SupabaseClient,
  params: {
    tourId: string;
    sessionId?: string;
    cancelAll?: boolean;
    reason?: string;
  }
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { tourId, sessionId, cancelAll, reason } = params;

  const { data: tour, error: tourErr } = await serviceClient
    .from('tours')
    .select('id, title, status')
    .eq('id', tourId)
    .single();

  if (tourErr || !tour) {
    return { ok: false, status: 404, error: 'Тур не найден' };
  }

  const tourTitle = String((tour as { title?: string }).title || 'Тур');

  if (cancelAll || !sessionId) {
    if ((tour as { status?: string }).status === 'cancelled') {
      return { ok: false, status: 400, error: 'Тур уже отменён' };
    }

    const { data: bookings } = await serviceClient
      .from('bookings')
      .select('id, user_id, status')
      .eq('tour_id', tourId)
      .in('status', ['pending', 'confirmed']);

    const userIds = [...new Set((bookings || []).map((b: { user_id: string }) => b.user_id))];
    const emails = await collectParticipantEmails(serviceClient, userIds);

    const { error: upBook } = await serviceClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('tour_id', tourId)
      .in('status', ['pending', 'confirmed']);

    if (upBook) {
      console.error('[tour/cancel] bookings', upBook);
      return { ok: false, status: 500, error: 'Не удалось обновить бронирования' };
    }

    await serviceClient
      .from('tour_sessions')
      .update({ status: 'cancelled' })
      .eq('tour_id', tourId);

    const { error: upTour } = await serviceClient
      .from('tours')
      .update({ status: 'cancelled' })
      .eq('id', tourId);

    if (upTour) {
      console.error('[tour/cancel] tour', upTour);
      return { ok: false, status: 500, error: 'Не удалось отменить тур' };
    }

    void Promise.allSettled(
      emails.map((to) => sendTourCancelledEmail({ to, tourTitle, reason }))
    ).catch(() => {});

    void publishCatalogChanged();
    return { ok: true };
  }

  const { data: session, error: sessionErr } = await serviceClient
    .from('tour_sessions')
    .select('id, start_at, end_at, status')
    .eq('id', sessionId)
    .eq('tour_id', tourId)
    .single();

  if (sessionErr || !session) {
    return { ok: false, status: 404, error: 'Выезд не найден' };
  }

  if ((session as { status?: string }).status === 'cancelled') {
    return { ok: false, status: 400, error: 'Этот выезд уже отменён' };
  }

  const departureLabel = formatSessionRange(
    (session as { start_at: string }).start_at,
    (session as { end_at: string | null }).end_at
  );

  const { data: bookings } = await serviceClient
    .from('bookings')
    .select('id, user_id, status')
    .eq('tour_id', tourId)
    .eq('session_id', sessionId)
    .in('status', ['pending', 'confirmed']);

  const userIds = [...new Set((bookings || []).map((b: { user_id: string }) => b.user_id))];
  const emails = await collectParticipantEmails(serviceClient, userIds);

  const { error: upBook } = await serviceClient
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('tour_id', tourId)
    .eq('session_id', sessionId)
    .in('status', ['pending', 'confirmed']);

  if (upBook) {
    console.error('[tour/cancel/session] bookings', upBook);
    return { ok: false, status: 500, error: 'Не удалось обновить бронирования' };
  }

  const { error: upSession } = await serviceClient
    .from('tour_sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId);

  if (upSession) {
    console.error('[tour/cancel/session] session', upSession);
    return { ok: false, status: 500, error: 'Не удалось отменить выезд' };
  }

  const { count: activeSessionsLeft } = await serviceClient
    .from('tour_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('tour_id', tourId)
    .eq('status', 'active');

  if ((activeSessionsLeft ?? 0) === 0 && (tour as { status?: string }).status !== 'cancelled') {
    await serviceClient.from('tours').update({ status: 'cancelled' }).eq('id', tourId);
  } else {
    await recalcTourDatesFromSessions(serviceClient, tourId);
  }

  void Promise.allSettled(
    emails.map((to) =>
      sendTourCancelledEmail({
        to,
        tourTitle,
        reason,
        departureLabel,
      })
    )
  ).catch(() => {});

  void publishCatalogChanged();
  return { ok: true };
}
