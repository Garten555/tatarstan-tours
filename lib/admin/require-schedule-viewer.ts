import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SCHEDULE_ROLES = ['guide', 'tour_admin', 'super_admin'] as const;

export type ScheduleViewerRole = (typeof SCHEDULE_ROLES)[number];

export function canViewTeamSchedule(role: string): role is ScheduleViewerRole {
  return (SCHEDULE_ROLES as readonly string[]).includes(role);
}

export async function requireScheduleViewer(
  supabase: SupabaseClient
): Promise<{ user: User; role: ScheduleViewerRole } | null> {
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
  if (!canViewTeamSchedule(role)) return null;

  return { user, role };
}
