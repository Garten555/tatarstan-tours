// Страница туристического паспорта пользователя - редизайн в стиле соцсетей
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import { 
  MapPin, 
  Calendar, 
  BookOpen, 
  Award, 
  Compass,
  ExternalLink,
  Star,
  Trophy,
  TrendingUp,
  Users,
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import AchievementsRefreshButton from '@/components/passport/AchievementsRefreshButton';
import AchievementCard from '@/components/passport/AchievementCard';
import { ExportMapButton } from '@/components/passport/ExportMapButton';
import PassportTabs from '@/components/passport/PassportTabs';

const ACHIEVEMENT_STYLES: Record<
  string,
  { icon: string; bg: string; border: string }
> = {
  first_tour: { icon: '🥇', bg: 'from-yellow-50 to-amber-50', border: 'border-amber-200' },
  history: { icon: '🏛️', bg: 'from-amber-50 to-orange-50', border: 'border-orange-200' },
  nature: { icon: '🌿', bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200' },
  culture: { icon: '🎭', bg: 'from-purple-50 to-fuchsia-50', border: 'border-purple-200' },
  architecture: { icon: '🏰', bg: 'from-slate-50 to-blue-50', border: 'border-blue-200' },
  gastronomy: { icon: '🍽️', bg: 'from-rose-50 to-red-50', border: 'border-rose-200' },
  adventure: { icon: '⛰️', bg: 'from-indigo-50 to-sky-50', border: 'border-indigo-200' },
  '10_tours': { icon: '🔟', bg: 'from-teal-50 to-cyan-50', border: 'border-teal-200' },
  '25_tours': { icon: '🏅', bg: 'from-yellow-50 to-lime-50', border: 'border-lime-200' },
  '50_tours': { icon: '🏆', bg: 'from-orange-50 to-yellow-50', border: 'border-orange-200' },
  '100_tours': { icon: '💎', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200' },
  offline_participation: { icon: '⭐', bg: 'from-yellow-50 to-amber-50', border: 'border-yellow-300' },
  helpful: { icon: '🤝', bg: 'from-blue-50 to-cyan-50', border: 'border-blue-300' },
  photographer: { icon: '📸', bg: 'from-purple-50 to-pink-50', border: 'border-purple-300' },
  social: { icon: '😊', bg: 'from-pink-50 to-rose-50', border: 'border-pink-300' },
  punctual: { icon: '⏰', bg: 'from-green-50 to-emerald-50', border: 'border-green-300' },
  enthusiast: { icon: '🔥', bg: 'from-orange-50 to-red-50', border: 'border-orange-300' },
  explorer: { icon: '🧭', bg: 'from-indigo-50 to-blue-50', border: 'border-indigo-300' },
  team_player: { icon: '👥', bg: 'from-teal-50 to-cyan-50', border: 'border-teal-300' },
  curious: { icon: '❓', bg: 'from-violet-50 to-purple-50', border: 'border-violet-300' },
  respectful: { icon: '🙏', bg: 'from-amber-50 to-yellow-50', border: 'border-amber-300' },
  energetic: { icon: '⚡', bg: 'from-yellow-50 to-orange-50', border: 'border-yellow-300' },
  memory_keeper: { icon: '📝', bg: 'from-slate-50 to-gray-50', border: 'border-slate-300' },
};

export default async function PassportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/passport');
  }

  const serviceClient = createServiceClient();
  
  // Получаем профиль пользователя
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('username, public_profile_enabled, id, first_name, last_name, avatar_url, is_banned, ban_reason, banned_at, reputation_score, status_level')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/profile/settings');
  }

  // Если пользователь забанен, показываем страницу бана
  if (profile.is_banned) {
    redirect('/banned');
  }

  // Если есть username и публичный профиль включен - редиректим на публичный профиль
  if (profile.username && profile.public_profile_enabled) {
    redirect(`/users/${profile.username}#passport`);
  }

  // Получаем данные для паспорта
  const [
    achievementsResult,
    completedToursResult,
    locationsResult,
  ] = await Promise.all([
    // Достижения
    serviceClient
      .from('achievements')
      .select(`
        id,
        badge_type,
        badge_name,
        badge_description,
        badge_icon_url,
        unlock_date,
        tour_id,
        diary_id,
        tour:tours(id, title, slug, cover_image),
        diary:travel_diaries(id, title)
      `)
      .eq('user_id', user.id)
      .order('unlock_date', { ascending: false })
      .limit(50),
    
    // Завершенные туры
    serviceClient
      .from('bookings')
      .select(`
        id,
        tour:tours!bookings_tour_id_fkey(
          id,
          title,
          slug,
          start_date,
          cover_image,
          city:cities(name),
          yandex_map_url
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false }),
    
    // Локации из дневников и туров
    Promise.all([
      serviceClient
        .from('travel_diaries')
        .select('location_data, tour_id')
        .eq('user_id', user.id)
        .eq('status', 'published')
        .not('location_data', 'is', null),
      serviceClient
        .from('bookings')
        .select(`
          tour_id,
          tour:tours!bookings_tour_id_fkey(
            city:cities(name)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'completed']),
    ]).then(([diariesResult, bookingsResult]) => {
      const locationsMap = new Map<string, { name: string; visit_count: number; tour_ids: string[] }>();
      
      // Локации из дневников
      if (diariesResult.data) {
        diariesResult.data.forEach((diary: any) => {
          if (diary.location_data?.locations) {
            diary.location_data.locations.forEach((loc: any) => {
              if (loc.name) {
                const existing = locationsMap.get(loc.name);
                if (existing) {
                  existing.visit_count += 1;
                  if (diary.tour_id && !existing.tour_ids.includes(diary.tour_id)) {
                    existing.tour_ids.push(diary.tour_id);
                  }
                } else {
                  locationsMap.set(loc.name, {
                    name: loc.name,
                    visit_count: 1,
                    tour_ids: diary.tour_id ? [diary.tour_id] : [],
                  });
                }
              }
            });
          }
        });
      }
      
      // Локации из туров
      if (bookingsResult.data) {
        bookingsResult.data.forEach((booking: any) => {
          const cityName = booking.tour?.city?.name;
          if (cityName) {
            const existing = locationsMap.get(cityName);
            if (existing) {
              existing.visit_count += 1;
              if (booking.tour_id && !existing.tour_ids.includes(booking.tour_id)) {
                existing.tour_ids.push(booking.tour_id);
              }
            } else {
              locationsMap.set(cityName, {
                name: cityName,
                visit_count: 1,
                tour_ids: booking.tour_id ? [booking.tour_id] : [],
              });
            }
          }
        });
      }
      
      return Array.from(locationsMap.values()).sort((a, b) => b.visit_count - a.visit_count).slice(0, 20);
    }).catch(() => []),
  ]);

  const achievements = achievementsResult.data || [];
  const completedTours = completedToursResult.data || [];
  const locations = Array.isArray(locationsResult) ? locationsResult : [];

  const fullName = profile.first_name || profile.last_name 
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : 'Путешественник';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Шапка профиля в стиле соцсетей */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        {/* Обложка */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600">
          <div className="absolute inset-0 bg-[url('/hero-tatarstan.jpg')] bg-cover bg-center opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/30 to-emerald-900/50"></div>
        </div>

        {/* Контент профиля */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-20 pb-6">
            {/* Аватар */}
            <div className="relative inline-block">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={fullName}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-4xl md:text-5xl font-black">
                    {fullName[0]?.toUpperCase() || 'П'}
                  </div>
                )}
              </div>
            </div>

            {/* Информация о пользователе */}
            <div className="mt-4">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-1">
                {fullName}
              </h1>
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold">Туристический паспорт</span>
              </div>

              {/* Статистика */}
              <div className="flex flex-wrap gap-4 md:gap-6 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Достижения</div>
                    <div className="text-lg font-black text-gray-900">{achievements.length}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <Compass className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Туры</div>
                    <div className="text-lg font-black text-gray-900">{completedTours.length}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Места</div>
                    <div className="text-lg font-black text-gray-900">{locations.length}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <Star className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Очки опыта</div>
                    <div className="text-lg font-black text-emerald-700">{profile.reputation_score || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент с табами */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PassportTabs
          achievements={achievements}
          completedTours={completedTours}
          locations={locations}
          reputationScore={profile.reputation_score || 0}
          achievementStyles={ACHIEVEMENT_STYLES}
          username={profile.username}
        />
      </div>
    </div>
  );
}
