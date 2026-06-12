'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase/client';
import { getUserFromSession } from '@/lib/supabase/auth-quick-client';

/**
 * Стабильное состояние авторизации для шапки: не прячем колокольчик/меню
 * на TOKEN_REFRESHED и кратковременных сбоях getSession.
 */
export function useHeaderAuth() {
  const hadSessionRef = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const applySession = (sessionUser: User | null, signedOut: boolean) => {
      if (sessionUser) {
        hadSessionRef.current = true;
        setUser(sessionUser);
        setIsAuthed(true);
        return;
      }
      if (signedOut) {
        hadSessionRef.current = false;
        setUser(null);
        setIsAuthed(false);
        return;
      }
      if (!hadSessionRef.current) {
        setUser(null);
        setIsAuthed(false);
      }
    };

    void getUserFromSession(supabase).then((sessionUser) => {
      applySession(sessionUser, false);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session?.user ?? null, event === 'SIGNED_OUT');
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isAuthed, ready };
}
