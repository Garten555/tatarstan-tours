/** Одно событие для всех клиентских подписок Pusher (user / notifications). Достижения обрабатываются внутри моста. */
export const PUSHER_BRIDGE_EVENT = 'tt:pusher';

export type PusherBridgeDetail =
  | { channel: 'user'; event: 'new-message' }
  | { channel: 'notifications'; event: 'new-notification' };

export function dispatchPusherBridge(detail: PusherBridgeDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PUSHER_BRIDGE_EVENT, { detail }));
}
