'use client';

import { useEffect, useRef } from 'react';
import {
  clearViewingTourRoomIds,
  setViewingTourRoomIds,
} from '@/lib/tour-rooms/client-viewing';

const INTERVAL_MS = 20_000;

async function pingViewing(roomId: string): Promise<string[] | null> {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return null;
  }
  try {
    const res = await fetch(`/api/tour-rooms/${roomId}/viewing`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const ids = Array.isArray(data?.relatedRoomIds)
      ? (data.relatedRoomIds as string[]).map(String)
      : [roomId];
    setViewingTourRoomIds(ids);
    window.dispatchEvent(new Event('notifications:update'));
    return ids;
  } catch {
    return null;
  }
}

async function leaveViewing(roomId: string) {
  clearViewingTourRoomIds();
  try {
    await fetch(`/api/tour-rooms/${roomId}/viewing`, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    /* ignore */
  }
}

/** Heartbeat: сервер не шлёт push, пока пользователь в комнате тура. */
export default function TourRoomViewingHeartbeat({ roomId }: { roomId: string }) {
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    void pingViewing(roomId);

    const id = window.setInterval(() => {
      if (mounted.current) void pingViewing(roomId);
    }, INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void pingViewing(roomId);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      void leaveViewing(roomId);
    };
  }, [roomId]);

  return null;
}
