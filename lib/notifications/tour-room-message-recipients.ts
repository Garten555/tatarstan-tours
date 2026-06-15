import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchMergedRoomParticipants,
  getRoomScope,
} from '@/lib/tour-rooms/merged-room-participants';

/**
 * Кому отправлять push/in-app уведомление о новом сообщении в комнате тура.
 * — назначенный гид этой комнаты;
 * — участники выезда (в т.ч. из duplicate-комнат и броней);
 * — не другие гиды, случайно попавшие в participants чужой комнаты.
 */
export async function resolveTourRoomMessageRecipients(
  serviceClient: SupabaseClient,
  roomId: string,
  senderId: string
): Promise<string[]> {
  const scope = await getRoomScope(serviceClient, roomId);
  if (!scope) return [];

  const { participants } = await fetchMergedRoomParticipants(serviceClient, roomId);
  const roomGuideId = scope.guide_id;
  const recipientIds = new Set<string>();

  for (const row of participants) {
    const uid = row.user_id;
    if (!uid || uid === senderId) continue;

    const profileRole = (row.user as { role?: string | null } | undefined)?.role ?? null;
    if (profileRole === 'guide' && uid !== roomGuideId) continue;

    recipientIds.add(uid);
  }

  if (roomGuideId && roomGuideId !== senderId) {
    recipientIds.add(roomGuideId);
  }

  return Array.from(recipientIds);
}
