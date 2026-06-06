'use client';

import { useEffect } from 'react';
import {
  PUSHER_BRIDGE_EVENT,
  type PusherBridgeDetail,
} from '@/lib/pusher/user-bridge-events';

/** На /banned слушает Pusher и уводит на профиль сразу после разбана. */
export function BannedPageLiveSync() {
  useEffect(() => {
    const onPusherBridge = (ev: Event) => {
      const d = (ev as CustomEvent<PusherBridgeDetail>).detail;
      if (d?.channel !== 'admin-sync' || d.event !== 'forced-reload') return;
      if (d.reason === 'unban') {
        window.location.assign('/profile');
      }
    };

    window.addEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);
    return () => window.removeEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);
  }, []);

  return null;
}
