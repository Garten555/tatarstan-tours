// Страница публичного профиля пользователя
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import PublicProfileLayout from '@/components/profile/PublicProfileLayout';

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
    profile_cover_url?: string | null;
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
  const isAdmin = Boolean(profileData.role && ['tour_admin', 'support_admin', 'super_admin'].includes(profileData.role));

  // Загружаем URL шапки профиля из site_settings
  const { data: coverSetting } = await serviceClient
    .from('site_settings')
    .select('value_json')
    .eq('key', `profile_cover:${profileData.id}`)
    .maybeSingle();

  const profileCoverUrl =
    coverSetting?.value_json &&
    typeof coverSetting.value_json === 'object' &&
    'url' in coverSetting.value_json &&
    typeof coverSetting.value_json.url === 'string'
      ? coverSetting.value_json.url
      : null;
  
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
      const isPublicProfile = profileData.public_profile_enabled;
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
      
      // Если это владелец профиля ИЛИ туристический паспорт публичный, показываем все посты (включая черновики)
      // Если это чужой профиль и паспорт не публичный, показываем только опубликованные и публичные
      if (!isOwner && !isPublicProfile) {
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
  const recentAchievements = recentAchievementsListResult.data || [];
  // Проверяем подписку: если isFollowingCheckResult существует и data не null и не пустой массив, значит подписан
  const isFollowing = isFollowingCheckResult !== null && 
    isFollowingCheckResult?.data !== null && 
    isFollowingCheckResult?.data !== undefined &&
    (Array.isArray(isFollowingCheckResult.data) ? isFollowingCheckResult.data.length > 0 : true);
  // Все туры (подтвержденные и завершенные) для блога
  const allToursForBlog = (toursWithLocationsResult?.data || []).filter((b: any) => b.tour);
  const completedTours = allToursForBlog.filter((b: any) => b.status === 'completed');
  const upcomingTours = allToursForBlog.filter((b: any) => b.status === 'confirmed');
  
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
    <PublicProfileLayout
      profileData={profileData}
      profileCoverUrl={profileCoverUrl}
      stats={stats}
      statusLevel={statusLevel}
      isBanned={isBanned}
      isAdmin={isAdmin}
      isCurrentUserAdmin={isCurrentUserAdmin}
      currentUser={currentUser}
      cleanUsername={cleanUsername}
      privacySettings={privacySettings}
      areFriends={areFriends}
      isFollowing={isFollowing}
      friendsList={friendsList}
      followersList={followersList}
      followingList={followingList}
      roleLabel={isAdmin ? getRoleLabel(profileData.role) : undefined}
      recentBlogPosts={recentBlogPosts}
      allUserMedia={allUserMedia}
      recentAchievements={recentAchievements}
      completedTours={completedTours}
      upcomingTours={upcomingTours}
      locations={locations}
      achievementStyles={ACHIEVEMENT_STYLES}
    />
  );
}

