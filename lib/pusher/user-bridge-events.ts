/** Одно событие для всех клиентских подписок Pusher. Достижения обрабатываются внутри моста. */
export const PUSHER_BRIDGE_EVENT = 'tt:pusher';

export type PusherBridgeDetail =
  | { channel: 'user'; event: 'new-message'; senderId?: string | null }
  | { channel: 'user'; event: 'bookings-changed' }
  | { channel: 'notifications'; event: 'new-notification' }
  | { channel: 'moderation'; event: 'reports-changed' }
  | { channel: 'admin-sync'; event: 'profile-role'; role: string | null }
  | { channel: 'admin-sync'; event: 'forced-reload'; reason: 'banned' | 'unban' };

export function dispatchPusherBridge(detail: PusherBridgeDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PUSHER_BRIDGE_EVENT, { detail }));
}
