import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/server';
import { canViewTeamSchedule } from '@/lib/admin/require-schedule-viewer';
import { currentMoscowDay } from '@/lib/tour/team-schedule-range';

const TeamScheduleBoard = dynamic(() => import('@/components/admin/TeamScheduleBoard'), {
  loading: () => (
    <div className="rounded-2xl border border-gray-200 bg-white p-16 text-center text-gray-500">
      Загрузка календаря…
    </div>
  ),
});

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

  const today = currentMoscowDay();
  const initialMonth = `${today.year}-${String(today.month).padStart(2, '0')}`;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <TeamScheduleBoard
        initialMonth={initialMonth}
        initialSelectedDay={today.key}
        viewerRole={role}
      />
    </div>
  );
}
