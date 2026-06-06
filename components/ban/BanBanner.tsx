'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getUserFromSession } from '@/lib/supabase/auth-quick-client';
import {
  PUSHER_BRIDGE_EVENT,
  type PusherBridgeDetail,
} from '@/lib/pusher/user-bridge-events';

export default function BanBanner() {
  const [banInfo, setBanInfo] = useState<{
    is_banned: boolean;
    ban_reason: string | null;
    ban_until: string | null;
  } | null>(null);
  const pathname = usePathname();

  const refreshBanStatus = async () => {
    const user = await getUserFromSession(supabase);
    if (!user) {
      setBanInfo(null);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, ban_reason, ban_until')
      .eq('id', user.id)
      .single();

    const profileData = profile as {
      is_banned?: boolean;
      ban_reason?: string | null;
      ban_until?: string | null;
    } | null;

    if (!profileData?.is_banned) {
      setBanInfo(null);
      return;
    }

    if (profileData.ban_until) {
      const until = new Date(profileData.ban_until);
      if (until.getTime() <= Date.now()) {
        setBanInfo(null);
        return;
      }
    }

    setBanInfo({
      is_banned: true,
      ban_reason: profileData.ban_reason || null,
      ban_until: profileData.ban_until || null,
    });
  };

  useEffect(() => {
    if (pathname === '/banned' || pathname?.startsWith('/admin')) {
      return;
    }
    void refreshBanStatus();
  }, [pathname]);

  useEffect(() => {
    const onPusherBridge = (ev: Event) => {
      const d = (ev as CustomEvent<PusherBridgeDetail>).detail;
      if (d?.channel !== 'admin-sync' || d.event !== 'forced-reload') return;

      if (d.reason === 'banned') {
        if (pathname !== '/banned' && !pathname?.startsWith('/admin')) {
          window.location.assign('/banned');
        }
        return;
      }

      if (d.reason === 'unban') {
        setBanInfo(null);
        if (pathname === '/banned') {
          window.location.assign('/profile');
          return;
        }
        void refreshBanStatus();
      }
    };

    window.addEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);
    return () => window.removeEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);
  }, [pathname]);

  useEffect(() => {
    if (banInfo?.is_banned && pathname !== '/banned' && !pathname?.startsWith('/admin')) {
      window.location.assign('/banned');
    }
  }, [banInfo, pathname]);

  return null;
}
