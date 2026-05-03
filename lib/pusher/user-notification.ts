import Pusher from 'pusher';
import {
  type AdminSyncPayload,
  ADMIN_SYNC_PUSHER_EVENT,
  adminSyncChannelName,
} from '@/lib/pusher/admin-sync-payload';

export type UserNotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  created_at: string;
};

let pusherSingleton: Pusher | null | undefined;

function getPusher(): Pusher | null {
  if (pusherSingleton !== undefined) {
    return pusherSingleton;
  }
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.PUSHER_SECRET
  ) {
    pusherSingleton = null;
    return null;
  }
  pusherSingleton = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    useTLS: true,
  });
  return pusherSingleton;
}

/** Канал `notifications-${userId}`, событие `new-notification` — то же соглашение, что в tour-rooms PATCH */
export async function publishUserNotification(
  userId: string,
  notification: UserNotificationRow
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(`notifications-${userId}`, 'new-notification', {
      notification,
    });
  } catch (e) {
    console.error('[publishUserNotification]', e);
  }
}

/** Достижения: канал `achievements-${userId}`, событие `achievement-earned` (без Supabase Realtime). */
export async function publishAchievementEarned(
  userId: string,
  achievement: {
    id: string;
    badge_name?: string | null;
    badge_type?: string | null;
    badge_description?: string | null;
  }
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(`achievements-${userId}`, 'achievement-earned', {
      achievement,
    });
  } catch (e) {
    console.error('[publishAchievementEarned]', e);
  }
}

export type { AdminSyncPayload } from '@/lib/pusher/admin-sync-payload';

export async function publishAdminSync(userId: string, payload: AdminSyncPayload): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(adminSyncChannelName(userId), ADMIN_SYNC_PUSHER_EVENT, payload);
  } catch (e) {
    console.error('[publishAdminSync]', e);
  }
}
