'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import Pusher from 'pusher-js';
import { supabase } from '@/lib/supabase/client';

type AchievementPayload = {
  id: string;
  badge_name?: string | null;
  badge_type?: string | null;
  badge_description?: string | null;
};

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    // Ignore sound errors (autoplay restrictions)
  }
};

export default function RealtimeNotifications() {
  const lastAchievementIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let pusherInst: Pusher | null = null;
    let channelInst: ReturnType<Pusher['subscribe']> | null = null;

    const teardown = () => {
      try {
        channelInst?.unbind_all();
        channelInst?.unsubscribe();
        channelInst = null;
        if (pusherInst) {
          pusherInst.disconnect();
          pusherInst = null;
        }
      } catch {
        // ignore
      }
    };

    const subscribe = async () => {
      teardown();
      const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
      const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!active || !userId || !key || !cluster) return;

      const pusher = new Pusher(key, {
        cluster,
        enabledTransports: ['ws', 'wss'],
      });
      pusherInst = pusher;

      const channel = pusher.subscribe(`achievements-${userId}`);
      channelInst = channel;

      channel.bind(
        'achievement-earned',
        (payload: { achievement?: AchievementPayload }) => {
          const achievement = payload?.achievement;
          if (!achievement?.id) return;
          if (lastAchievementIdRef.current === achievement.id) {
            return;
          }
          lastAchievementIdRef.current = achievement.id;

          const title = achievement.badge_name || 'Новое достижение';
          toast.success(`Вам присвоено достижение: ${title}`);
          playNotificationSound();

          fetch('/api/notifications', {
            method: 'POST',
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

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      subscribe();
    });

    return () => {
      active = false;
      teardown();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
