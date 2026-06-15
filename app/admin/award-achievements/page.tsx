import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import AwardAchievementsList from '@/components/admin/AwardAchievementsList';
import { Award } from 'lucide-react';
import { canIssueOfflineAchievementsInAnyRoom } from '@/lib/achievements/offline-issue-access';
import { dedupeAwardRooms } from '@/lib/achievements/dedupe-award-rooms';
import { loadGuideTourRooms } from '@/lib/admin/guide-tour-room-rows';

export const metadata = {
  title: 'Выдача достижений - Админ панель',
  description: 'Выдача достижений участникам туров',
};

export default async function AwardAchievementsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'user';

  if (userRole !== 'guide' && userRole !== 'tour_admin' && userRole !== 'super_admin') {
    redirect('/');
  }

  const canBrowseAllRooms = canIssueOfflineAchievementsInAnyRoom(userRole);

  const roomsRaw = await loadGuideTourRooms(serviceClient, {
    guideId: canBrowseAllRooms ? undefined : user.id,
    limit: canBrowseAllRooms ? 200 : 100,
  });

  const rooms = dedupeAwardRooms(roomsRaw);

  return (
    <div>
      <div className="mb-8 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="px-3 py-1.5 bg-amber-100/50 border border-amber-200/50 rounded-xl">
            <span className="text-sm font-bold text-amber-700">Достижения</span>
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3 mb-2">
          <Award className="w-7 h-7 md:w-8 md:h-8 text-amber-600" />
          Выдача достижений
        </h1>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          {canBrowseAllRooms
            ? 'Все комнаты туров — можно выдать офлайн-достижение любому участнику или себе'
            : 'Выдавайте достижения участникам ваших туров за активность и заслуги'}
        </p>
      </div>

      <AwardAchievementsList
        rooms={rooms}
        adminCanBrowseAllRooms={canBrowseAllRooms}
        viewerUserId={user.id}
        viewerRole={userRole}
      />
    </div>
  );
}
