import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import GuideToursList from '@/components/admin/GuideToursList';

export const metadata = {
  title: 'Мои туры - Админ панель',
  description: 'Управление турами, где вы назначены гидом',
};

export default async function MyToursPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем авторизацию
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Получаем роль пользователя
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role || 'user';

  // Проверяем, является ли пользователь гидом или админом
  if (userRole !== 'guide' && userRole !== 'tour_admin' && userRole !== 'super_admin' && userRole !== 'support_admin') {
    redirect('/');
  }

  // Загружаем комнаты где пользователь является гидом
  const { data: rooms } = await serviceClient
    .from('tour_rooms')
    .select(`
      id,
      tour_id,
      is_active,
      created_at,
      tour:tours(
        id,
        title,
        start_date,
        end_date,
        cover_image,
        city:cities(name)
      ),
      participants:tour_room_participants(count)
    `)
    .eq('guide_id', user.id)
    .order('created_at', { ascending: false });

  // Подсчитываем количество участников для каждой комнаты
  interface RoomData {
    id: unknown;
    tour_id: unknown;
    is_active: unknown;
    created_at: unknown;
    tour?: {
      id: unknown;
      title: unknown;
      start_date: unknown;
      end_date: unknown;
      cover_image?: unknown;
      city?: { name: unknown } | { name: unknown }[] | null;
    } | {
      id: unknown;
      title: unknown;
      start_date: unknown;
      end_date: unknown;
      cover_image?: unknown;
      city?: { name: unknown } | { name: unknown }[] | null;
    }[] | null;
    participants?: { count?: unknown }[] | null;
  }

  const participantCountFromEmbed = (raw: RoomData['participants']): number => {
    if (!Array.isArray(raw) || raw.length === 0) return 0;
    const n = raw[0]?.count;
    if (typeof n === 'number' && !Number.isNaN(n)) return n;
    if (typeof n === 'string') {
      const parsed = parseInt(n, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const roomsWithCounts = (rooms || [])
    .map((room: RoomData) => {
      const tour =
        Array.isArray(room.tour) && room.tour.length > 0
          ? room.tour[0]
          : room.tour && !Array.isArray(room.tour)
            ? room.tour
            : null;

      if (!tour) return null;

      const city =
        Array.isArray(tour.city) && tour.city.length > 0
          ? { name: String(tour.city[0].name) }
          : tour.city && !Array.isArray(tour.city)
            ? { name: String(tour.city.name) }
            : undefined;

      return {
        id: String(room.id),
        tour_id: String(room.tour_id),
        is_active: Boolean(room.is_active),
        created_at: String(room.created_at),
        tour: {
          id: String(tour.id),
          title: String(tour.title),
          start_date: String(tour.start_date),
          end_date: tour.end_date ? String(tour.end_date) : null,
          cover_image: tour.cover_image ? String(tour.cover_image) : null,
          city,
        },
        participants_count: participantCountFromEmbed(room.participants),
      };
    })
    .filter((room): room is NonNullable<typeof room> => room !== null);

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Мои туры</h1>
        <p className="mt-2 text-gray-600">
          Управление комнатами туров, где вы назначены гидом
        </p>
      </div>

      {/* Список туров */}
      <GuideToursList rooms={roomsWithCounts} />
    </div>
  );
}












