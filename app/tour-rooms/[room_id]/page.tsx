// Страница комнаты тура
import { TourRoom } from '@/components/tour-rooms/TourRoom';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTourRoomAccess } from '@/lib/tour-rooms/room-access';

interface TourRoomPageProps {
  params: Promise<{ room_id: string }>;
}

export default async function TourRoomPage({ params }: TourRoomPageProps) {
  const { room_id } = await params;

  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверка авторизации
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Получаем комнату
  const { data: room, error: roomError } = await serviceClient
    .from('tour_rooms')
    .select(`
      *,
      tour:tours(id, title, start_date, end_date, cover_image, city:cities(name)),
      guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url, role, is_banned),
      participants:tour_room_participants(
        id,
        user:profiles(id, first_name, last_name, avatar_url)
      )
    `)
    .eq('id', room_id)
    .single();

  if (roomError || !room) {
    return (
      <div className="flex min-h-below-header items-center justify-center bg-[#f0f2f5] px-4 py-16 pt-site-header box-border">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-red-600">Комната не найдена или у вас нет доступа</p>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const viewerRole = (profile as { role?: string } | null)?.role ?? 'user';
  const access = await getTourRoomAccess(serviceClient, room_id, user.id, viewerRole);

  if (!access?.isParticipant && !access?.isGuide && !access?.isAdmin) {
    return (
      <div className="flex min-h-below-header items-center justify-center bg-[#f0f2f5] px-4 py-16 pt-site-header box-border">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-red-600">У вас нет доступа к этой комнате</p>
        </div>
      </div>
    );
  }

  const isGuide = access.isGuide;
  const isAdmin = access.isAdmin;

  const guideRel = (room as { guide?: { id?: string; role?: string | null; is_banned?: boolean | null } | { id?: string; role?: string | null; is_banned?: boolean | null }[] })
    .guide;
  const guideProfile = Array.isArray(guideRel) ? guideRel[0] : guideRel;

  return (
    <TourRoom
      roomId={room_id}
      initialRoom={room}
      viewerUserId={user.id}
      viewerRole={viewerRole}
      guideUserId={(room as { guide_id?: string }).guide_id ?? guideProfile?.id}
      guideRole={guideProfile?.role ?? null}
      guideIsBanned={Boolean(guideProfile?.is_banned)}
      galleryCanModerate={isGuide || isAdmin}
    />
  );
}

