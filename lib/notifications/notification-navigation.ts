import type { NotificationBodyMeta } from '@/lib/notifications/parse-notification-body';

/** Куда перейти по клику на уведомление; null — не кликабельно. */
export function getNotificationHref(
  type: string | null,
  meta: NotificationBodyMeta
): string | null {
  switch (type) {
    case 'tour_room_message':
      return meta.roomId ? `/tour-rooms/${meta.roomId}?tab=chat` : null;
    case 'message':
      return meta.senderId ? `/messenger?user=${encodeURIComponent(meta.senderId)}` : '/messenger';
    case 'support_message':
    case 'support_session_closed':
      return '/support';
    case 'achievement':
      return meta.achievementId ? `/passport?achievement=${encodeURIComponent(meta.achievementId)}` : '/passport';
    case 'friend_request':
    case 'friendship':
      if (meta.senderUsername) return `/users/${encodeURIComponent(meta.senderUsername)}`;
      if (meta.senderId) return `/messenger?user=${encodeURIComponent(meta.senderId)}`;
      return '/friends';
    case 'info':
    case 'warning':
      if (/гид|комнат|тур/i.test(meta.displayText)) return '/admin/my-tours';
      return null;
    case 'tour_reschedule':
      return '/profile/bookings';
    case 'blog_post':
      return '/feed?type=post';
    default:
      return null;
  }
}

export function isNotificationClickable(type: string | null, meta: NotificationBodyMeta): boolean {
  return getNotificationHref(type, meta) !== null;
}
