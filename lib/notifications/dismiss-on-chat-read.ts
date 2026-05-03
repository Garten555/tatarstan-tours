import type { SupabaseClient } from '@supabase/supabase-js';

/** Удаляет уведомления о ЛС от указанного отправителя (прочитали переписку). */
export async function dismissDmNotificationsForSender(
  serviceClient: SupabaseClient,
  recipientUserId: string,
  senderUserId: string
): Promise<void> {
  const { error } = await serviceClient
    .from('notifications')
    .delete()
    .eq('user_id', recipientUserId)
    .eq('type', 'message')
    .like('body', `%sender_id:${senderUserId}%`);

  if (error) {
    console.error('[dismissDmNotificationsForSender]', error);
  }
}

/** Удаляет уведомления о сообщениях в комнате тура после открытия чата. */
export async function dismissTourRoomNotificationsForRoom(
  serviceClient: SupabaseClient,
  userId: string,
  roomId: string
): Promise<void> {
  const { error } = await serviceClient
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'tour_room_message')
    .like('body', `%room_id:${roomId}%`);

  if (error) {
    console.error('[dismissTourRoomNotificationsForRoom]', error);
  }
}
