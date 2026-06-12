import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TeamScheduleBoard from '@/components/admin/TeamScheduleBoard';
import { canViewTeamSchedule } from '@/lib/admin/require-schedule-viewer';
import { currentMoscowWeekStart } from '@/lib/tour/team-schedule-range';

export const metadata = {
  title: 'Расписание - Админ панель',
  description: 'Недельное расписание выездов и занятость гидов',
};

export default async function TeamSchedulePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?redirect=/admin/schedule');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = (profile as { role?: string | null } | null)?.role ?? '';
  if (!canViewTeamSchedule(role)) {
    redirect('/unauthorized');
  }

  const weekStart = currentMoscowWeekStart().key;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <TeamScheduleBoard initialWeekStart={weekStart} viewerRole={role} />
    </div>
  );
}
