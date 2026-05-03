'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const INTERVAL_MS = 120_000;

async function pingPresence() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return;
  }
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session) return;

  try {
    await fetch('/api/users/presence', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    /* ignore */
  }
}

export default function PresenceHeartbeat() {
  const pathname = usePathname();
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    void pingPresence();

    const id = window.setInterval(() => {
      if (mounted.current) void pingPresence();
    }, INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void pingPresence();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  return null;
}
