// Страница публичного профиля пользователя
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import { 
  MapPin, 
  Calendar, 
  BookOpen, 
  Award, 
  Star, 
  Users, 
  UserPlus,
  UserMinus,
  Globe,
  Lock,
  Compass,
  ExternalLink,
  Shield,
  CheckCircle2,
  ImageIcon
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import { FollowButton } from '@/components/profile/FollowButton';
import { FriendButton } from '@/components/profile/FriendButton';
import { MessageButton } from '@/components/profile/MessageButton';
import { ExportMapButton } from '@/components/passport/ExportMapButton';
import AchievementsRefreshButton from '@/components/passport/AchievementsRefreshButton';
import AchievementCard from '@/components/passport/AchievementCard';
import BlogPostsList from '@/components/blog/BlogPostsList';
import UserGallery from '@/components/passport/UserGallery';
import BanUserButton from '@/components/admin/BanUserButton';

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

const STATUS_LEVELS = {
  1: { name: 'Новичок', color: 'bg-gray-500', icon: '🌱' },
  2: { name: 'Исследователь', color: 'bg-blue-500', icon: '🧭' },
  3: { name: 'Знаток региона', color: 'bg-purple-500', icon: '🎓' },
  4: { name: 'Эксперт', color: 'bg-yellow-500', icon: '👑' },
};

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
  // Офлайн достижения, выдаваемые гидами во время туров
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

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Убираем @ если есть
  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

  // Получаем текущего пользователя
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Проверяем, является ли текущий пользователь админом
  let isCurrentUserAdmin = false;
  if (currentUser) {
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    const currentUserRole = (currentUserProfile as { role?: string } | null)?.role;
    isCurrentUserAdmin = currentUserRole ? ['tour_admin', 'support_admin', 'super_admin'].includes(currentUserRole) : false;
  }

  // Проверяем, является ли параметр UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUsername);

  // Получаем профиль по username или ID
  let profileQuery = serviceClient
    .from('profiles')
    .select(`
      id,
      username,
      bio,
      avatar_url,
      public_profile_enabled,
      status_level,
      reputation_score,
      role,
      is_banned,
      banned_at,
      ban_reason,
      ban_until,
      created_at
    `);

  if (isUUID) {
    // Если передан UUID, ищем по ID
    profileQuery = profileQuery.eq('id', cleanUsername);
  } else {
    // Иначе ищем по username
    profileQuery = profileQuery.eq('username', cleanUsername);
  }

  const { data: profile, error: profileError } = await profileQuery.maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  // Если профиль не публичный, проверяем доступ:
  // - это профиль текущего пользователя ИЛИ
  // - текущий пользователь является админом
  if (!profile.public_profile_enabled && (!currentUser || (currentUser.id !== profile.id && !isCurrentUserAdmin))) {
    notFound();
  }

  // TypeScript guard
  const profileData = profile as {
    id: string;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
    public_profile_enabled: boolean;
    status_level: number;
    reputation_score: number;
    role: string;
    is_banned: boolean | null;
    banned_at: string | null;
    ban_reason: string | null;
    ban_until: string | null;
    created_at: string;
  };

  // Определяем, является ли пользователь админом
  const isAdmin = profileData.role && ['tour_admin', 'support_admin', 'super_admin'].includes(profileData.role);
  
  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      user: 'Пользователь',
      tour_admin: 'Администратор туров',
      support_admin: 'Администратор поддержки',
      super_admin: 'Супер администратор',
    };
    return roles[role] || role;
  };

  // Получаем настройки приватности целевого пользователя
  const { data: privacySettings } = await serviceClient
    .from('user_message_privacy')
    .select('who_can_follow, who_can_add_friend')
    .eq('user_id', profileData.id)
    .maybeSingle();

  // Проверяем, являемся ли мы друзьями (если есть текущий пользователь)
  let areFriends = false;
  if (currentUser && currentUser.id !== profileData.id) {
    const user1_id = currentUser.id < profileData.id ? currentUser.id : profileData.id;
    const user2_id = currentUser.id < profileData.id ? profileData.id : currentUser.id;
    
    const { data: friendship } = await serviceClient
      .from('user_friends')
      .select('status')
      .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
      .eq('status', 'accepted')
      .maybeSingle();
    
    areFriends = !!friendship;
  }

  // Получаем статистику и данные паспорта параллельно
  const [
    diariesCountResult,
    achievementsCountResult,
    reviewsCountResult,
    bookingsCountResult,
    followersCountResult,
    followingCountResult,
    recentDiariesResult,
    recentAchievementsResult,
    isFollowingResult,
    recentBlogPostsResult,
    recentAchievementsListResult,
    isFollowingCheckResult,
    locationsResult,
    toursWithLocationsResult,
    userGalleryResult,
    followersListResult,
    followingListResult,
    friendsListResult
  ] = await Promise.all([
    // Опубликованные посты блога
    serviceClient
      .from('travel_blog_posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileData.id)
      .eq('status', 'published'),
    
    // Достижения
    serviceClient
      .from('achievements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileData.id),
    
    // Отзывы
    serviceClient
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileData.id)
      .eq('is_published', true),
    
    // Завершенные туры
    serviceClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileData.id)
      .eq('status', 'completed'),
    
    // Подписчики
    serviceClient
      .from('user_follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followed_id', profileData.id),
    
    // Подписки
    serviceClient
      .from('user_follows')
      .select('followed_id', { count: 'exact', head: true })
      .eq('follower_id', profileData.id),
    
    // Список подписчиков (первые 6)
    serviceClient
      .from('user_follows')
      .select(`
        follower_id,
        follower:profiles!user_follows_follower_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('followed_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(6),
    
    // Список подписок (первые 6)
    serviceClient
      .from('user_follows')
      .select(`
        followed_id,
        followed:profiles!user_follows_followed_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('follower_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(6),
    
    // Список друзей (первые 6)
    currentUser && currentUser.id === profileData.id ? serviceClient
      .from('user_friends')
      .select(`
        id,
        user_id,
        friend_id,
        friend:profiles!user_friends_friend_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        ),
        user:profiles!user_friends_user_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .or(`user_id.eq.${profileData.id},friend_id.eq.${profileData.id}`)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(6) : Promise.resolve({ data: [], error: null }),
    
    // Последние посты блога
    (() => {
      const isOwner = currentUser?.id === profileData.id;
      let query = serviceClient
        .from('travel_blog_posts')
        .select(`
          id,
          user_id,
          title,
          slug,
          excerpt,
          content,
          cover_image_url,
          views_count,
          likes_count,
          comments_count,
          created_at,
          published_at,
          status,
          visibility,
          user:profiles!travel_blog_posts_user_id_fkey(id, username, avatar_url),
          category:blog_categories(id, name, color)
        `)
        .eq('user_id', profileData.id);
      
      // Если это владелец профиля, показываем все посты (включая черновики)
      // Если это чужой профиль, показываем только опубликованные и публичные
      if (!isOwner) {
        query = query.eq('status', 'published').eq('visibility', 'public');
      }
      
      return query
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(6);
    })(),
    
    // Последние достижения
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
        verification_data,
        tour:tours!achievements_tour_id_fkey(
          id,
          title,
          slug,
          cover_image,
          category
        ),
        diary:travel_diaries!achievements_diary_id_fkey(
          id,
          title
        )
      `)
      .eq('user_id', profileData.id)
      .order('unlock_date', { ascending: false })
      .limit(10),
    
    // Проверка подписки: проверяем, подписан ли текущий пользователь на владельца профиля
    currentUser ? serviceClient
      .from('user_follows')
      .select('follower_id, followed_id')
      .eq('follower_id', currentUser.id)
      .eq('followed_id', profileData.id)
      .maybeSingle() : Promise.resolve(null),
    
    // Посещенные локации из постов блога
    serviceClient
      .from('travel_blog_posts')
      .select('location_tags, tour_id')
      .eq('user_id', profileData.id)
      .eq('status', 'published')
      .neq('location_tags', '{}'),
    
    // Туры с локациями (из всех бронирований - подтвержденных и завершенных)
    serviceClient
      .from('bookings')
      .select(`
        id,
        tour_id,
        booking_date,
        status,
        tour:tours(
          id,
          title,
          slug,
          cover_image,
          start_date,
          end_date,
          yandex_map_url,
          city:cities(id, name)
        )
      `)
      .eq('user_id', profileData.id)
      .in('status', ['confirmed', 'completed'])
      .order('booking_date', { ascending: false })
      .limit(20),
    
    // Галерея пользователя
    serviceClient
      .from('user_gallery')
      .select('id, media_type, media_url, thumbnail_url, created_at')
      .eq('user_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(100),
    
    // Список подписчиков (первые 6)
    serviceClient
      .from('user_follows')
      .select(`
        follower_id,
        follower:profiles!user_follows_follower_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('followed_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(6),
    
    // Список подписок (первые 6)
    serviceClient
      .from('user_follows')
      .select(`
        followed_id,
        followed:profiles!user_follows_followed_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('follower_id', profileData.id)
      .order('created_at', { ascending: false })
      .limit(6),
    
    // Список друзей (первые 6) - только если это свой профиль или мы друзья
    (currentUser && (currentUser.id === profileData.id || areFriends)) ? serviceClient
      .from('user_friends')
      .select(`
        id,
        user_id,
        friend_id,
        friend:profiles!user_friends_friend_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        ),
        user:profiles!user_friends_user_id_fkey(
          id,
          username,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .or(`user_id.eq.${profileData.id},friend_id.eq.${profileData.id}`)
      .eq('status', 'accepted')
      .order('accepted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(6) : Promise.resolve({ data: [], error: null }),
  ]);

  const stats = {
    diaries_count: diariesCountResult.count || 0, // Оставляем для обратной совместимости
    blog_posts_count: diariesCountResult.count || 0, // Новое поле
    achievements_count: achievementsCountResult.count || 0,
    reviews_count: reviewsCountResult.count || 0,
    completed_tours_count: bookingsCountResult.count || 0,
    followers_count: followersCountResult.count || 0,
    following_count: followingCountResult.count || 0,
  };

  const recentDiaries = recentDiariesResult.data || [];
  const recentBlogPosts = recentBlogPostsResult.data || []; // Посты блога
  
  // Логирование для отладки
  if (recentBlogPostsResult.error) {
    console.error('Error fetching blog posts:', recentBlogPostsResult.error);
  }
  console.log('Blog posts fetched:', {
    count: recentBlogPosts.length,
    posts: recentBlogPosts.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      publishedAt: p.published_at,
      status: p.status,
      visibility: p.visibility,
      user_id: p.user_id
    }))
  });
  
  const recentAchievements = recentAchievementsListResult.data || [];
  // Проверяем подписку: если isFollowingCheckResult существует и data не null и не пустой массив, значит подписан
  const isFollowing = isFollowingCheckResult !== null && 
    isFollowingCheckResult?.data !== null && 
    isFollowingCheckResult?.data !== undefined &&
    (Array.isArray(isFollowingCheckResult.data) ? isFollowingCheckResult.data.length > 0 : true);
  // Все туры (подтвержденные и завершенные) для блога
  const allToursForBlog = (toursWithLocationsResult?.data || []).filter((b: any) => b.tour);
  const completedTours = allToursForBlog.filter((b: any) => b.status === 'completed');
  
  // Галерея пользователя
  const allUserMedia = (Array.isArray(userGalleryResult?.data) ? userGalleryResult.data : []).map((media: any) => ({
    id: media.id,
    media_url: media.media_url,
    media_type: media.media_type,
    thumbnail_url: media.thumbnail_url,
    created_at: media.created_at,
  }));

  // Обрабатываем списки друзей и подписчиков
  const followersList = (followersListResult.data || []).map((f: any) => {
    const follower = Array.isArray(f.follower) ? f.follower[0] : f.follower;
    return {
      id: follower?.id || f.follower_id,
      username: follower?.username,
      first_name: follower?.first_name,
      last_name: follower?.last_name,
      avatar_url: follower?.avatar_url,
    };
  }).filter((f: any) => f.id);

  const followingList = (followingListResult.data || []).map((f: any) => {
    const followed = Array.isArray(f.followed) ? f.followed[0] : f.followed;
    return {
      id: followed?.id || f.followed_id,
      username: followed?.username,
      first_name: followed?.first_name,
      last_name: followed?.last_name,
      avatar_url: followed?.avatar_url,
    };
  }).filter((f: any) => f.id);

  const friendsList = (friendsListResult.data || []).map((f: any) => {
    const isUser1 = f.user_id === profileData.id;
    const friend = isUser1 
      ? (Array.isArray(f.friend) ? f.friend[0] : f.friend)
      : (Array.isArray(f.user) ? f.user[0] : f.user);
    return {
      id: friend?.id,
      username: friend?.username,
      first_name: friend?.first_name,
      last_name: friend?.last_name,
      avatar_url: friend?.avatar_url,
    };
  }).filter((f: any) => f.id);

  // Обрабатываем локации из дневников и туров
  const locationsMap = new Map<string, { name: string; visit_count: number; tour_ids: string[] }>();
  
  // Локации из постов блога
  if (locationsResult && locationsResult.data) {
    locationsResult.data.forEach((post: any) => {
      if (post.location_tags && Array.isArray(post.location_tags)) {
        post.location_tags.forEach((locName: string) => {
          if (locName) {
            const existing = locationsMap.get(locName);
            if (existing) {
              existing.visit_count += 1;
              if (post.tour_id && !existing.tour_ids.includes(post.tour_id)) {
                existing.tour_ids.push(post.tour_id);
              }
            } else {
              locationsMap.set(locName, { 
                name: locName, 
                visit_count: 1,
                tour_ids: post.tour_id ? [post.tour_id] : []
              });
            }
          }
        });
      }
    });
  }
  
  // Добавляем города из завершенных туров
  if (toursWithLocationsResult && toursWithLocationsResult.data) {
    toursWithLocationsResult.data.forEach((booking: any) => {
      if (booking.tour?.city?.name) {
        const cityName = booking.tour.city.name;
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
            tour_ids: booking.tour_id ? [booking.tour_id] : []
          });
        }
      }
    });
  }
  
  const locations = Array.from(locationsMap.values()).sort((a, b) => b.visit_count - a.visit_count).slice(0, 10);

  // Для админа показываем максимальный уровень, для остальных - их реальный уровень
  const displayStatusLevel = isAdmin ? 4 : profileData.status_level;
  const statusLevel = STATUS_LEVELS[displayStatusLevel as keyof typeof STATUS_LEVELS] || STATUS_LEVELS[1];

  // Проверяем, забанен ли пользователь
  // Проверяем is_banned и наличие banned_at как более надежный индикатор
  const isBanned = profileData.is_banned === true || 
                   (profileData.banned_at !== null && profileData.banned_at !== undefined);

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden pt-[4.5rem] lg:pt-[5rem]">
      {/* Декоративные элементы фона */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full">
        {/* Заголовок профиля */}
        <div id="profile" className="bg-white border-b border-gray-100 p-4 md:p-6 lg:p-8 scroll-mt-20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
            {/* Аватар */}
            <div className="relative flex-shrink-0">
              {profileData.avatar_url ? (
                <Image
                  src={profileData.avatar_url}
                  alt={escapeHtml(profileData.username || 'Пользователь')}
                  width={140}
                  height={140}
                  className="rounded-full object-cover border-4 border-emerald-300 shadow-2xl w-[140px] h-[140px]"
                />
              ) : (
                <div className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-6xl font-black border-4 border-emerald-300 shadow-2xl">
                  {escapeHtml((profileData.username || 'U')[0].toUpperCase())}
                </div>
              )}
              {/* Бейдж уровня - скрываем у админа и забаненных, показываем только бейдж админа */}
              {!isBanned && !isAdmin && (
                <div className={`absolute -bottom-2 -right-2 ${statusLevel.color} text-white rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-xl border-4 border-white`}>
                  {statusLevel.icon}
                </div>
              )}
              {/* Бейдж админа - скрываем для забаненных */}
              {!isBanned && isAdmin && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl border-4 border-white z-10" title={getRoleLabel(profileData.role)}>
                  <Shield className="w-7 h-7" />
                </div>
              )}
              {/* Бейдж бана */}
              {isBanned && (
                <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl border-4 border-white z-10" title="Аккаунт заблокирован">
                  <Lock className="w-7 h-7" />
                </div>
              )}
            </div>

            {/* Информация */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900">
                  {escapeHtml(profileData.username || 'Пользователь')}
                </h1>
                {!isBanned && isAdmin && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold text-sm shadow-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{getRoleLabel(profileData.role)}</span>
                  </div>
                )}
                {!isBanned && (
                  <span className={`px-4 py-2 ${statusLevel.color} text-white text-sm font-bold rounded-xl shadow-md`}>
                    {statusLevel.name}
                  </span>
                )}
                {isBanned && (
                  <span className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Заблокирован</span>
                  </span>
                )}
                {isCurrentUserAdmin && currentUser && currentUser.id !== profileData.id && (
                  <BanUserButton
                    userId={profileData.id}
                    isBanned={profileData.is_banned || false}
                    banReason={profileData.ban_reason}
                    bannedAt={profileData.banned_at}
                    banUntil={profileData.ban_until}
                    userRole={profileData.role}
                  />
                )}
              </div>
              
              {!isBanned && profileData.bio && (
                <p className="text-lg md:text-xl text-gray-600 mb-4 leading-relaxed">{escapeHtml(profileData.bio)}</p>
              )}

              {/* Кнопки действий (если не свой профиль) */}
              {!isBanned && currentUser && currentUser.id !== profileData.id && (() => {
                // Проверяем, можем ли мы подписаться (показываем кнопку только если можем подписаться ИЛИ уже подписан)
                const canFollow = isFollowing || (!privacySettings || 
                  privacySettings.who_can_follow === 'everyone' || 
                  (privacySettings.who_can_follow === 'friends' && areFriends));
                
                // Проверяем, можем ли мы добавить в друзья
                const canAddFriend = !privacySettings || 
                  privacySettings.who_can_add_friend === 'everyone' || 
                  (privacySettings.who_can_add_friend === 'friends' && areFriends);

                return (
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    {canFollow && (
                      <FollowButton 
                        username={profileData.username || profileData.id}
                        isFollowing={isFollowing}
                        userId={profileData.id}
                      />
                    )}
                    {canAddFriend && (
                      <FriendButton 
                        userId={profileData.id}
                        username={cleanUsername}
                      />
                    )}
                    <MessageButton 
                      userId={profileData.id}
                      username={cleanUsername}
                    />
                  </div>
                );
              })()}

              {/* Статистика */}
              {!isBanned && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mt-4">
                  <div className="text-center p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-emerald-200">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500 mb-1">{stats.blog_posts_count}</div>
                    <div className="text-sm md:text-base font-bold text-gray-700">Постов в блоге</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-blue-200">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500 mb-1">{stats.achievements_count}</div>
                    <div className="text-base md:text-lg font-bold text-gray-700">Достижений</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-purple-200">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-500 mb-1">{stats.followers_count}</div>
                    <div className="text-sm md:text-base font-bold text-gray-700">Подписчиков</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 hover:border-teal-200">
                    <div className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-500 mb-1">{stats.completed_tours_count}</div>
                    <div className="text-sm md:text-base font-bold text-gray-700">Туров</div>
                  </div>
                </div>
              )}

              {/* Друзья и подписчики - показываем только если есть данные */}
              {!isBanned && (friendsList.length > 0 || followersList.length > 0 || followingList.length > 0) && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Друзья */}
                  {(currentUser?.id === profileData.id || areFriends) && friendsList.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 md:p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          Друзья
                        </h3>
                        <Link
                          href={`/users/${cleanUsername}/friends`}
                          className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Все
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {friendsList.slice(0, 6).map((friend: any) => (
                          <Link
                            key={friend.id}
                            href={`/users/${friend.username || friend.id}`}
                            className="group relative"
                          >
                            {friend.avatar_url ? (
                              <Image
                                src={friend.avatar_url}
                                alt={friend.first_name && friend.last_name ? `${friend.first_name} ${friend.last_name}` : friend.username || 'Друг'}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full border-2 border-gray-200 group-hover:border-blue-400 transition-colors object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 group-hover:border-blue-400 transition-colors">
                                {(friend.first_name?.[0] || friend.username?.[0] || 'Д').toUpperCase()}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Подписчики */}
                  {followersList.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 md:p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-purple-600" />
                          Подписчики
                        </h3>
                        <Link
                          href={`/users/${cleanUsername}/followers`}
                          className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors"
                        >
                          Все ({stats.followers_count})
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {followersList.slice(0, 6).map((follower: any) => (
                          <Link
                            key={follower.id}
                            href={`/users/${follower.username || follower.id}`}
                            className="group relative"
                          >
                            {follower.avatar_url ? (
                              <Image
                                src={follower.avatar_url}
                                alt={follower.first_name && follower.last_name ? `${follower.first_name} ${follower.last_name}` : follower.username || 'Подписчик'}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full border-2 border-gray-200 group-hover:border-purple-400 transition-colors object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 group-hover:border-purple-400 transition-colors">
                                {(follower.first_name?.[0] || follower.username?.[0] || 'П').toUpperCase()}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Подписки */}
                  {followingList.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-100 p-4 md:p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                          <UserMinus className="w-5 h-5 text-emerald-600" />
                          Подписки
                        </h3>
                        <Link
                          href={`/users/${cleanUsername}/following`}
                          className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          Все ({stats.following_count})
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {followingList.slice(0, 6).map((following: any) => (
                          <Link
                            key={following.id}
                            href={`/users/${following.username || following.id}`}
                            className="group relative"
                          >
                            {following.avatar_url ? (
                              <Image
                                src={following.avatar_url}
                                alt={following.first_name && following.last_name ? `${following.first_name} ${following.last_name}` : following.username || 'Подписка'}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full border-2 border-gray-200 group-hover:border-emerald-400 transition-colors object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm border-2 border-gray-200 group-hover:border-emerald-400 transition-colors">
                                {(following.first_name?.[0] || following.username?.[0] || 'П').toUpperCase()}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Быстрые действия (только для владельца) */}
        {!isBanned && currentUser && currentUser.id === profileData.id && (
          <div className="bg-white border-b border-gray-100 p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
                <span className="text-sm font-bold text-emerald-700">Быстрые действия</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              <Link
                href="/tours"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-lg text-gray-900">Найти туры</div>
                  <div className="text-sm text-gray-600">Откройте новые места</div>
                </div>
              </Link>
              <Link
                href="/profile/settings"
                className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-lg text-gray-900">Настройки</div>
                  <div className="text-sm text-gray-600">Управляйте профилем</div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Блог путешествий */}
        {!isBanned && (
          <div className="bg-white border-b border-gray-100 p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
                <span className="text-sm font-bold text-emerald-700">Блог путешествий</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 flex items-center gap-3">
              <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
              Мои путешествия
            </h2>
            
            <BlogPostsList 
              initialPosts={recentBlogPosts}
              userId={profileData.id}
              completedTours={allToursForBlog}
              isOwner={currentUser?.id === profileData.id}
              isAdminView={Boolean(isCurrentUserAdmin && currentUser && currentUser.id !== profileData.id)}
            />
          </div>
        )}

        {/* Галерея пользователя */}
        {!isBanned && (
          <div className="bg-white border-b border-gray-100 p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1.5 bg-purple-100/50 border border-purple-200/50 rounded-xl">
                <span className="text-sm font-bold text-purple-700">Галерея</span>
              </div>
            </div>
            <Link 
              href={`/users/${profileData.username || profileData.id}/gallery`}
              className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 flex items-center gap-3 hover:text-purple-600 transition-colors cursor-pointer group"
            >
              <ImageIcon className="w-7 h-7 md:w-8 md:h-8 text-purple-600 group-hover:scale-110 transition-transform" />
              Мои фото и видео
            </Link>
            <UserGallery 
              media={allUserMedia.slice(0, 8)} 
              userId={profileData.id}
              isOwner={currentUser?.id === profileData.id}
              username={profileData.username || profileData.id}
              showViewAll={true}
            />
          </div>
        )}

        {/* Достижения (Паспорт) */}
        <div id="passport" className="bg-white border-b border-gray-100 p-4 md:p-6 lg:p-8 scroll-mt-20">
          {(isBanned || profileData.is_banned) ? (
            <div className="text-center py-20 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-4 border-red-400 shadow-2xl">
              <div className="mb-8">
                <Lock className="w-32 h-32 mx-auto text-red-600" />
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-red-900 mb-6">
                🚫 Аккаунт заблокирован
              </h2>
              <p className="text-2xl md:text-3xl font-black text-red-800 max-w-3xl mx-auto mb-8 leading-relaxed">
                Этот аккаунт был заблокирован администрацией.
              </p>
              <p className="text-xl md:text-2xl font-bold text-red-700 max-w-2xl mx-auto mb-8">
                Информация о туристическом паспорте недоступна.
              </p>
              {profileData.ban_reason && (
                <div className="mt-8 p-6 bg-white rounded-xl border-4 border-red-400 max-w-2xl mx-auto shadow-lg">
                  <p className="text-xl md:text-2xl font-black text-red-900 mb-3">Причина блокировки:</p>
                  <p className="text-lg md:text-xl font-bold text-red-800 leading-relaxed">{escapeHtml(profileData.ban_reason)}</p>
                </div>
              )}
              {profileData.banned_at && (
                <div className="mt-6 text-lg md:text-xl font-bold text-red-700">
                  Дата блокировки: {new Date(profileData.banned_at).toLocaleString('ru-RU')}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-yellow-100/50 border border-yellow-200/50 rounded-xl">
                    <span className="text-base font-bold text-yellow-700">Достижения</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {currentUser && currentUser.id === profileData.id && (
                    <AchievementsRefreshButton />
                  )}
                  {recentAchievements.length > 0 && (
                    <span className="text-sm md:text-base font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl">
                      {recentAchievements.length} достижений
                    </span>
                  )}
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 flex items-center gap-3">
                <Award className="w-7 h-7 md:w-8 md:h-8 text-yellow-600" />
                Мои награды
              </h2>
              
              {/* Очки опыта - только для владельца */}
              {currentUser && currentUser.id === profileData.id && (
                <div className="mb-6 p-5 bg-white rounded-xl border-2 border-emerald-200 shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base md:text-lg font-bold text-gray-700 mb-1">Очки опыта</div>
                      <div className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500">{profileData.reputation_score || 0}</div>
                      <div className="text-base text-gray-600 mt-1">Начисляются за достижения</div>
                    </div>
                    <div className="text-5xl md:text-6xl">⭐</div>
                  </div>
                </div>
              )}
              
              {recentAchievements.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 lg:gap-6">
                  {recentAchievements.map((achievement: any) => {
                    const style = ACHIEVEMENT_STYLES[achievement.badge_type] || {
                      icon: '🏆',
                      bg: 'from-yellow-50 to-amber-50',
                      border: 'border-yellow-200',
                    };

                    return (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        achievementStyle={style}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Award className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <p className="text-2xl md:text-3xl font-black mb-2 text-gray-700">Пока нет достижений</p>
                  {isCurrentUserAdmin && currentUser && currentUser.id !== profileData.id ? (
                    <p className="text-lg md:text-xl text-gray-600">У пользователя пока нет достижений</p>
                  ) : (
                    <p className="text-lg md:text-xl text-gray-600">Создавайте дневники и участвуйте в турах, чтобы получить бейджи!</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Завершенные туры */}
        {!isBanned && completedTours.length > 0 && (
          <div className="bg-white border-b border-gray-100 p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
                  <span className="text-sm font-bold text-emerald-700">Завершенные туры</span>
                </div>
              </div>
              {completedTours.length > 0 && (
                <ExportMapButton tours={completedTours as any} username={profileData.username} />
              )}
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 flex items-center gap-3">
              <Compass className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
              Мои путешествия
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedTours.map((booking: any) => {
                const tour = booking.tour;
                if (!tour) return null;
                
                return (
                  <div
                    key={booking.id}
                    className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1"
                  >
                    {tour.cover_image && (
                      <div className="relative h-56 bg-gray-200 overflow-hidden">
                        <Image
                          src={tour.cover_image}
                          alt={escapeHtml(tour.title)}
                          fill
                          className="object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Link
                          href={`/tours/${tour.slug}`}
                          className="flex-1 group"
                        >
                          <h3 className="text-2xl md:text-3xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors mb-2">
                            {escapeHtml(tour.title)}
                          </h3>
                        </Link>
                        <Link
                          href={`/tours/${tour.slug}`}
                          className="text-gray-400 hover:text-emerald-600 ml-2 transition-colors p-2 hover:bg-emerald-50 rounded-lg"
                          title="Открыть тур"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </Link>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {tour.city && (
                          <div className="flex items-center gap-2 text-base md:text-lg text-gray-700 font-bold">
                            <MapPin className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 flex-shrink-0" />
                            <span>{escapeHtml(tour.city.name)}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-base md:text-lg text-gray-700 font-bold">
                          <Calendar className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 flex-shrink-0" />
                          <span>
                            {new Date(tour.start_date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {tour.yandex_map_url && (
                        <div className="mt-5 pt-5 border-t-2 border-gray-100">
                          <h4 className="text-base md:text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin className="w-5 h-5 md:w-6 md:h-6 text-emerald-600" />
                            Карта тура
                          </h4>
                          <div className="relative w-full h-56 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-inner">
                            {tour.yandex_map_url.includes('<iframe') ? (
                              <div
                                dangerouslySetInnerHTML={{ __html: tour.yandex_map_url }}
                                className="w-full h-full"
                              />
                            ) : (
                              <iframe
                                src={tour.yandex_map_url}
                                className="w-full h-full border-0"
                                allowFullScreen
                                loading="lazy"
                                title={`Карта тура: ${escapeHtml(tour.title)}`}
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Посещенные места */}
        {!isBanned && (
          <div className="bg-white border-b border-gray-100 p-4 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1.5 bg-blue-100/50 border border-blue-200/50 rounded-xl">
              <span className="text-sm font-bold text-blue-700">Посещенные места</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-4 flex items-center gap-3">
            <MapPin className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
            Мои локации
          </h2>
          {locations.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
              {locations.map((location, index) => (
                <div
                  key={`loc-${index}`}
                  className="p-6 bg-white rounded-2xl border-2 border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <MapPin className="w-8 h-8 md:w-10 md:h-10 text-blue-600 mb-3" />
                  <div className="font-black text-lg md:text-xl text-gray-900 mb-2">
                    {escapeHtml(location.name)}
                  </div>
                  <div className="text-base md:text-lg font-bold text-gray-700 mb-2">
                    {location.visit_count} {location.visit_count === 1 ? 'раз' : 'раза'}
                  </div>
                  {location.tour_ids && location.tour_ids.length > 0 && (
                    <div className="text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl inline-block">
                      {location.tour_ids.length} {location.tour_ids.length === 1 ? 'тур' : 'туров'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <MapPin className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-2xl md:text-3xl font-black mb-2 text-gray-700">Пока нет посещенных мест</p>
              {isCurrentUserAdmin && currentUser && currentUser.id !== profileData.id ? (
                <p className="text-lg md:text-xl text-gray-600">У пользователя пока нет посещенных мест</p>
              ) : (
                <p className="text-lg md:text-xl text-gray-600">Создавайте дневники и участвуйте в турах, чтобы отслеживать свои путешествия!</p>
              )}
            </div>
          )}
          </div>
        )}

      </div>
    </div>
  );
}

