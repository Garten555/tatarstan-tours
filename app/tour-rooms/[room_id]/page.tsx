// Страница комнаты тура
import { TourRoom } from '@/components/tour-rooms/TourRoom';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

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
      guide:profiles!tour_rooms_guide_id_fkey(id, first_name, last_name, avatar_url),
      participants:tour_room_participants(
        id,
        user:profiles(id, first_name, last_name, avatar_url)
      )
    `)
    .eq('id', room_id)
    .single();

  if (roomError || !room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          Комната не найдена или у вас нет доступа
        </div>
      </div>
    );
  }

  // Проверяем доступ: участник, гид или админ
  const { data: participant } = await serviceClient
    .from('tour_room_participants')
    .select('id')
    .eq('room_id', room_id)
    .eq('user_id', user.id)
    .single();

  // Проверяем права админа
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin =
    profile?.role === 'tour_admin' ||
    profile?.role === 'super_admin' ||
    profile?.role === 'support_admin';
  const isGuide = (room as any).guide_id === user.id;
  const isParticipant = !!participant;

  // Если не участник, не гид и не админ - доступ запрещен
  if (!isParticipant && !isGuide && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          У вас нет доступа к этой комнате
        </div>
      </div>
    );
  }

  return <TourRoom roomId={room_id} initialRoom={room} />;
}

