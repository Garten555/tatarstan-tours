'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
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
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const subscribe = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!active || !userId) return;

      channel = supabase
        .channel(`achievements-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'achievements',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const achievement = payload.new as AchievementPayload;
            if (achievement?.id && lastAchievementIdRef.current === achievement.id) {
              return;
            }
            lastAchievementIdRef.current = achievement?.id || null;

            const title = achievement?.badge_name || 'Новое достижение';
            toast.success(`Вам присвоено достижение: ${title}`);
            playNotificationSound();

            fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: title,
                body: achievement?.badge_description || null,
                type: 'achievement',
              }),
            }).finally(() => {
              window.dispatchEvent(new Event('notifications:update'));
            });
          }
        )
        .subscribe();
    };

    subscribe();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      channel?.unsubscribe();
      channel = null;
      subscribe();
    });

    return () => {
      active = false;
      channel?.unsubscribe();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}




