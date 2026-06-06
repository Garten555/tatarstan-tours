import type { SupabaseClient } from '@supabase/supabase-js';

export const ADMIN_ROLES = ['super_admin', 'support_admin', 'tour_admin'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export async function getViewerAdminRole(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role ?? null;
  return role && ADMIN_ROLES.includes(role as AdminRole) ? role : null;
}

export async function requireAdminRole(
  supabase: SupabaseClient
): Promise<{ ok: true; role: string } | { ok: false; status: number; error: string }> {
  const role = await getViewerAdminRole(supabase);
  if (!role) {
    return { ok: false, status: 403, error: 'Недостаточно прав' };
  }
  return { ok: true, role };
}
