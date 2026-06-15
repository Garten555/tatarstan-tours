import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getRelatedRoomIds,
  getRoomScope,
} from '@/lib/tour-rooms/merged-room-participants';

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
  await dismissTourRoomNotificationsForDeparture(serviceClient, userId, roomId);
}

/** Удаляет уведомления по всем duplicate-комнатам одного выезда. */
export async function dismissTourRoomNotificationsForDeparture(
  serviceClient: SupabaseClient,
  userId: string,
  roomId: string
): Promise<void> {
  const scope = await getRoomScope(serviceClient, roomId);
  const roomIds = scope ? await getRelatedRoomIds(serviceClient, scope) : [roomId];

  for (const rid of roomIds) {
    const { error } = await serviceClient
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'tour_room_message')
      .like('body', `%room_id:${rid}%`);

    if (error) {
      console.error('[dismissTourRoomNotificationsForDeparture]', rid, error);
    }
  }
}
