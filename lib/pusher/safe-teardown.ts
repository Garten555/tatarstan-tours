import type Pusher from 'pusher-js';

type ChannelLike = { unbind_all?: () => void } | null | undefined;

/**
 * Корректное отключение клиента Pusher. Не вызывать channel.unsubscribe(): при переключении
 * вкладки Supabase дергает recover session — сокет уже в CLOSING/CLOSED, а unsubscribe()
 * из pusher-js пытается send() и даёт «WebSocket is already in CLOSING or CLOSED state».
 */
export function disconnectPusherSafely(
  pusher: Pusher | null | undefined,
  channels: ChannelLike[]
): void {
  for (const ch of channels) {
    try {
      ch?.unbind_all?.();
    } catch {
      /* ignore */
    }
  }
  if (!pusher) return;
  try {
    pusher.disconnect();
  } catch {
    /* ignore */
  }
}
