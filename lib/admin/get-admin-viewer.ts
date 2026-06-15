import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type AdminViewer = {
  userId: string;
  role: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

/** Один getUser + profiles на RSC-запрос (layout + страницы админки). */
export const getAdminViewer = cache(async (): Promise<AdminViewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    role: String(profile.role ?? 'user'),
    firstName: String(profile.first_name ?? ''),
    lastName: String(profile.last_name ?? ''),
    avatarUrl: profile.avatar_url ? String(profile.avatar_url) : null,
  };
});
