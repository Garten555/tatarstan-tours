'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Pusher from 'pusher-js';
import { createClient } from '@/lib/supabase/client';
import { disconnectPusherSafely } from '@/lib/pusher/safe-teardown';
import {
  ADMIN_SYNC_PUSHER_EVENT,
  type AdminSyncPayload,
  adminSyncChannelName,
} from '@/lib/pusher/admin-sync-payload';

const ADMIN_ROLES = ['super_admin', 'tour_admin', 'support_admin', 'guide'];

type Props = {
  userId: string;
};

export default function AdminPusherSync({ userId }: Props) {
  const router = useRouter();
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!key || !userId) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe(adminSyncChannelName(userId));
    channelRef.current = channel;

    channel.bind(ADMIN_SYNC_PUSHER_EVENT, async (payload: AdminSyncPayload) => {
      if (payload.kind === 'forced_reload') {
        if (payload.reason === 'banned') {
          window.location.assign('/banned');
          return;
        }
        router.refresh();
        return;
      }
      if (payload.kind === 'profile_role') {
        const role = payload.role || 'user';
        router.refresh();
        if (!ADMIN_ROLES.includes(role)) {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.assign('/');
        }
        return;
      }
      if (payload.kind === 'guide_rooms') {
        router.refresh();
      }
    });

    return () => {
      disconnectPusherSafely(pusherRef.current, [channelRef.current]);
      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [userId, router]);

  return null;
}
