import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Синхронизирует назначенного гида с таблицей tour_room_participants:
 * гид должен быть в списке участников, чтобы отображаться в комнате тура.
 */
export async function syncGuideRoomParticipant(
  serviceClient: SupabaseClient,
  roomId: string,
  guideId: string | null | undefined,
  previousGuideId: string | null | undefined
): Promise<void> {
  const nextGuideId = guideId ?? null;
  const prevGuideId = previousGuideId ?? null;

  if (prevGuideId && prevGuideId !== nextGuideId) {
    const { error: removeError } = await serviceClient
      .from('tour_room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', prevGuideId)
      .is('booking_id', null);

    if (removeError) {
      console.error('Не удалось убрать гида из участников комнаты:', removeError);
    }
  }

  if (!nextGuideId) return;

  const { data: existing } = await serviceClient
    .from('tour_room_participants')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', nextGuideId)
    .maybeSingle();

  if (existing) return;

  const { error: insertError } = await serviceClient.from('tour_room_participants').insert({
    room_id: roomId,
    user_id: nextGuideId,
    booking_id: null,
  });

  if (insertError && insertError.code !== '23505') {
    console.error('Не удалось добавить гида в участники комнаты:', insertError);
  }
}
