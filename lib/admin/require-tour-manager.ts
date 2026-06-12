import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function requireTourManager(
  supabase: SupabaseClient
): Promise<{ user: User; role: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as { role?: string | null } | null)?.role ?? '';
  if (role !== 'tour_admin' && role !== 'super_admin') return null;

  return { user, role };
}
