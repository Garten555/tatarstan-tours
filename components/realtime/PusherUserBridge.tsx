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

type AchievementPayload = {
  id: string;
  badge_name?: string | null;
  badge_type?: string | null;
  badge_description?: string | null;
};

function playAchievementChime() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.06;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.12);
  } catch {
    /* ignore */
  }
}

export default function PusherUserBridge() {
  const lastAchievementIdRef = useRef<string | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelUserRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);
  const channelNotificationsRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);
  const channelAchievementsRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);

  useEffect(() => {
    let active = true;

    const teardown = () => {
      disconnectPusherSafely(pusherRef.current, [
        channelUserRef.current,
        channelNotificationsRef.current,
        channelAchievementsRef.current,
      ]);
      channelUserRef.current = null;
      channelNotificationsRef.current = null;
      channelAchievementsRef.current = null;
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
      chUser.bind('new-message', () => {
        dispatchPusherBridge({ channel: 'user', event: 'new-message' });
      });

      const chNotif = pusher.subscribe(`notifications-${user.id}`);
      channelNotificationsRef.current = chNotif;
      chNotif.bind('new-notification', () => {
        dispatchPusherBridge({ channel: 'notifications', event: 'new-notification' });
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
          toast.success(`Вам присвоено достижение: ${title}`);
          playAchievementChime();

          fetch('/api/notifications', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              body: achievement.badge_description || null,
              type: 'achievement',
            }),
          }).finally(() => {
            window.dispatchEvent(new Event('notifications:update'));
          });
        }
      );
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
