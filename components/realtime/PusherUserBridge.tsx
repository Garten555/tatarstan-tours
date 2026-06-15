'use client';

/**
 * Один экземпляр Pusher на пользователя: каналы user-, notifications-, achievements-.
 * Остальные компоненты слушают window (PUSHER_BRIDGE_EVENT), без дублирования WebSocket.
 */

import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { resolveAuthUserForUi } from '@/lib/supabase/auth-quick-client';
import { disconnectPusherSafely } from '@/lib/pusher/safe-teardown';
import { dispatchPusherBridge } from '@/lib/pusher/user-bridge-events';
import type { UserNotificationRow } from '@/lib/pusher/user-notification';
import {
  ADMIN_SYNC_PUSHER_EVENT,
  adminSyncChannelName,
  type AdminSyncPayload,
} from '@/lib/pusher/admin-sync-payload';
import {
  ADMIN_MODERATION_CHANNEL,
  ADMIN_MODERATION_EVENT,
  USER_BOOKINGS_EVENT,
} from '@/lib/pusher/channels';

import { playNotificationSound } from '@/lib/sound/notifications';
import { getAchievementBadgeIcon } from '@/lib/achievements/badge-icons';

type AchievementPayload = {
  id: string;
  badge_name?: string | null;
  badge_type?: string | null;
  badge_description?: string | null;
};

export default function PusherUserBridge() {
  const lastAchievementIdRef = useRef<string | null>(null);
  const achievementsSyncedUserRef = useRef<string | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelUserRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);
  const channelNotificationsRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);
  const channelAchievementsRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);
  const channelAdminSyncRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);
  const channelModerationRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);

  useEffect(() => {
    let active = true;

    const teardown = () => {
      disconnectPusherSafely(pusherRef.current, [
        channelUserRef.current,
        channelNotificationsRef.current,
        channelAchievementsRef.current,
        channelAdminSyncRef.current,
        channelModerationRef.current,
      ]);
      channelUserRef.current = null;
      channelNotificationsRef.current = null;
      channelAchievementsRef.current = null;
      channelAdminSyncRef.current = null;
      channelModerationRef.current = null;
      pusherRef.current = null;
    };

    const subscribe = async () => {
      teardown();

      const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
      const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
      if (!key || !cluster) return;

      const user = await resolveAuthUserForUi(supabase);
      if (!active || !user?.id) return;

      const pusher = new Pusher(key, {
        cluster,
      });
      pusherRef.current = pusher;

      const chUser = pusher.subscribe(`user-${user.id}`);
      channelUserRef.current = chUser;
      chUser.bind('new-message', (data: { message?: { sender_id?: string } }) => {
        dispatchPusherBridge({
          channel: 'user',
          event: 'new-message',
          senderId: data.message?.sender_id ?? null,
        });
      });
      chUser.bind(USER_BOOKINGS_EVENT, () => {
        dispatchPusherBridge({ channel: 'user', event: 'bookings-changed' });
      });

      const chNotif = pusher.subscribe(`notifications-${user.id}`);
      channelNotificationsRef.current = chNotif;
      chNotif.bind('new-notification', (payload: { notification?: UserNotificationRow }) => {
        dispatchPusherBridge({
          channel: 'notifications',
          event: 'new-notification',
          notification: payload?.notification,
        });
      });

      const chAch = pusher.subscribe(`achievements-${user.id}`);
      channelAchievementsRef.current = chAch;
      chAch.bind(
        'achievement-earned',
        (payload: { achievement?: AchievementPayload }) => {
          const achievement = payload?.achievement;
          if (!achievement?.id) return;
          if (lastAchievementIdRef.current === achievement.id) return;
          lastAchievementIdRef.current = achievement.id;

          const title = achievement.badge_name || 'Новое достижение';
          const icon = getAchievementBadgeIcon(achievement.badge_type);
          toast.success(`${icon} Вам присвоено достижение: ${title}`);
          playNotificationSound('achievement');
          window.dispatchEvent(new Event('notifications:update'));
        }
      );

      if (achievementsSyncedUserRef.current !== user.id) {
        achievementsSyncedUserRef.current = user.id;
        void fetch('/api/passport/achievements/repair', {
          method: 'POST',
          credentials: 'include',
        })
          .then(() => {
            window.dispatchEvent(new Event('notifications:update'));
          })
          .catch(() => {});
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      const role = (profile as { role?: string } | null)?.role ?? 'user';
      if (['super_admin', 'tour_admin', 'support_admin'].includes(role)) {
        const chMod = pusher.subscribe(ADMIN_MODERATION_CHANNEL);
        channelModerationRef.current = chMod;
        chMod.bind(ADMIN_MODERATION_EVENT, () => {
          dispatchPusherBridge({ channel: 'moderation', event: 'reports-changed' });
        });
      }

      const chAdminSync = pusher.subscribe(adminSyncChannelName(user.id));
      channelAdminSyncRef.current = chAdminSync;
      chAdminSync.bind(ADMIN_SYNC_PUSHER_EVENT, (payload: AdminSyncPayload) => {
        if (payload.kind === 'profile_role') {
          dispatchPusherBridge({ channel: 'admin-sync', event: 'profile-role', role: payload.role });
          return;
        }
        if (payload.kind === 'forced_reload') {
          dispatchPusherBridge({
            channel: 'admin-sync',
            event: 'forced-reload',
            reason: payload.reason,
          });
        }
      });
    };

    subscribe();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      subscribe();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      teardown();
    };
  }, []);

  return null;
}
