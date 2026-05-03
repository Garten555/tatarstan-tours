import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import AwardAchievementsList from '@/components/admin/AwardAchievementsList';
import { Award } from 'lucide-react';

export const metadata = {
  title: 'Выдача достижений - Админ панель',
  description: 'Выдача достижений участникам туров',
};

export default async function AwardAchievementsPage() {
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
  if (userRole !== 'guide' && userRole !== 'tour_admin' && userRole !== 'super_admin') {
    redirect('/');
  }

  const { data: roomsData } = await serviceClient
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

  const rooms = (roomsData || [])
    .map((room: RoomData) => {
      const tour =
        Array.isArray(room.tour) && room.tour.length > 0
          ? room.tour[0]
          : room.tour && !Array.isArray(room.tour)
            ? room.tour
            : null;

      if (!tour) return null;

      const city = tour.city
        ? Array.isArray(tour.city) && tour.city.length > 0
          ? { name: String(tour.city[0].name) }
          : !Array.isArray(tour.city)
            ? { name: String(tour.city.name) }
            : undefined
        : undefined;

      return {
        id: String(room.id),
        tour_id: String(room.tour_id),
        is_active: Boolean(room.is_active),
        created_at: String(room.created_at),
        participants_count: participantCountFromEmbed(room.participants),
        tour: {
          id: String(tour.id),
          title: String(tour.title),
          start_date: String(tour.start_date),
          end_date: tour.end_date ? String(tour.end_date) : null,
          cover_image: tour.cover_image ? String(tour.cover_image) : null,
          city,
        },
      };
    })
    .filter((room): room is NonNullable<typeof room> => room !== null);

  return (
    <div>
      {/* Заголовок в стиле главной страницы */}
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
          Выдавайте достижения участникам ваших туров за активность и заслуги
        </p>
      </div>

      {/* Список туров с участниками */}
      <AwardAchievementsList rooms={rooms} />
    </div>
  );
}



