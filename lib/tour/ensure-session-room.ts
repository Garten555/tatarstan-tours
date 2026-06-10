import type { SupabaseClient } from '@supabase/supabase-js';
import { syncGuideRoomParticipant } from '@/lib/tour-rooms/sync-guide-participant';

/**
 * Гарантирует строку tour_rooms для слота: одна комната на tour_session_id.
 * Обновляет guide_id в комнате из слота.
 */
export async function ensureTourRoomForSession(
  serviceClient: SupabaseClient,
  params: {
    tourId: string;
    sessionId: string;
    guideId: string | null;
    createdBy: string;
  }
): Promise<{ ok: boolean; roomId?: string; error?: string }> {
  const { tourId, sessionId, guideId, createdBy } = params;

  const { data: existing, error: selErr } = await serviceClient
    .from('tour_rooms')
    .select('id')
    .eq('tour_session_id', sessionId)
    .maybeSingle();

  if (selErr) {
    return { ok: false, error: selErr.message };
  }

  const row = existing as { id?: string } | null;
  if (row?.id) {
    const { data: currentRoom } = await serviceClient
      .from('tour_rooms')
      .select('guide_id')
      .eq('id', row.id)
      .single();

    const { error: upErr } = await serviceClient
      .from('tour_rooms')
      .update({ guide_id: guideId })
      .eq('id', row.id);
    if (upErr) {
      return { ok: false, error: upErr.message };
    }

    await syncGuideRoomParticipant(
      serviceClient,
      row.id,
      guideId,
      (currentRoom as { guide_id?: string | null } | null)?.guide_id
    );

    return { ok: true, roomId: row.id };
  }

  const { data: inserted, error: insErr } = await serviceClient
    .from('tour_rooms')
    .insert({
      tour_id: tourId,
      tour_session_id: sessionId,
      guide_id: guideId,
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    return { ok: false, error: insErr?.message ?? 'insert failed' };
  }

  const roomId = (inserted as { id: string }).id;

  if (guideId) {
    await syncGuideRoomParticipant(serviceClient, roomId, guideId, null);
  }

  return { ok: true, roomId };
}
