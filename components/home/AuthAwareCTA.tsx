'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CTASection } from './CTASection';

export default function AuthAwareCTA() {
  const [resolved, setResolved] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        setIsAuthed(!!session);
        setResolved(true);
      })
      .catch(() => {
        if (!mounted) return;
        setIsAuthed(false);
        setResolved(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthed(!!session);
      setResolved(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!resolved) return null;
  if (isAuthed) return null;

  return <CTASection />;
}

