'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const PusherUserBridge = dynamic(() => import('@/components/realtime/PusherUserBridge'), {
  ssr: false,
});

const PresenceHeartbeat = dynamic(() => import('@/components/presence/PresenceHeartbeat'), {
  ssr: false,
});

const SupportChatLauncher = dynamic(() => import('@/components/chat/SupportChatLauncher'), {
  ssr: false,
});

/**
 * Pusher, presence и виджет поддержки не нужны для первого кадра LCP.
 * Загружаем после idle — меньше работы на слабом CPU при открытии любой страницы.
 */
export default function DeferredRealtimeShell() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const w = typeof window !== 'undefined' ? window : undefined;
    if (!w) return;

    if ('requestIdleCallback' in w) {
      const id = w.requestIdleCallback(enable, { timeout: 2000 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback(id);
      };
    }

    const id = globalThis.setTimeout(enable, 400);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(id);
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <PusherUserBridge />
      <PresenceHeartbeat />
      <SupportChatLauncher />
    </>
  );
}
