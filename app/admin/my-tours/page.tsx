import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import GuideToursList from '@/components/admin/GuideToursList';
import { loadGuideTourRooms } from '@/lib/admin/guide-tour-room-rows';

export const metadata = {
  title: 'Мои туры - Админ панель',
  description: 'Управление турами, где вы назначены гидом',
};

export default async function MyToursPage() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

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

  if (userRole !== 'guide' && userRole !== 'tour_admin' && userRole !== 'super_admin' && userRole !== 'support_admin') {
    redirect('/');
  }

  const rooms = await loadGuideTourRooms(serviceClient, {
    guideId: user.id,
    resolveCanonical: false,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Мои туры</h1>
        <p className="mt-2 text-gray-600">
          Управление комнатами туров, где вы назначены гидом
        </p>
      </div>

      <GuideToursList rooms={rooms} />
    </div>
  );
}
