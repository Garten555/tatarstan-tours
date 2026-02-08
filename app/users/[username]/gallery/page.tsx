// Страница галереи пользователя
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ImageIcon, Video } from 'lucide-react';
import UserGallery from '@/components/passport/UserGallery';

interface UserGalleryPageProps {
  params: Promise<{ username: string }>;
}

export default async function UserGalleryPage({ params }: UserGalleryPageProps) {
  const { username } = await params;
  const cleanUsername = decodeURIComponent(username).trim();
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Проверяем, является ли текущий пользователь админом
  let isCurrentUserAdmin = false;
  if (currentUser) {
    const { data: currentUserProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    const currentUserRole = (currentUserProfile as { role?: string } | null)?.role;
    isCurrentUserAdmin = currentUserRole ? ['tour_admin', 'support_admin', 'super_admin'].includes(currentUserRole) : false;
  }

  // Проверяем, является ли username UUID или строкой
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUsername);

  let profileQuery = serviceClient
    .from('profiles')
    .select(`
      id,
      username,
      first_name,
      last_name,
      avatar_url,
      public_profile_enabled,
      role
    `);

  if (isUuid) {
    profileQuery = profileQuery.eq('id', cleanUsername);
  } else {
    profileQuery = profileQuery.eq('username', cleanUsername);
  }

  const { data: profile, error: profileError } = await profileQuery.maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  // Проверяем доступ к галерее:
  // - это свой профиль ИЛИ
  // - текущий пользователь является админом ИЛИ
  // - проверяем настройки приватности галереи
  if (profile.id === currentUser?.id || isCurrentUserAdmin) {
    // Владелец и админ всегда могут видеть галерею
  } else if (!currentUser) {
    // Неавторизованные пользователи могут видеть только если настройка "everyone"
    const { data: privacySettings } = await serviceClient
      .from('user_message_privacy')
      .select('who_can_view_gallery')
      .eq('user_id', profile.id)
      .maybeSingle();

    const whoCanViewGallery = privacySettings?.who_can_view_gallery || 'everyone';

    if (whoCanViewGallery !== 'everyone') {
      notFound();
    }
  } else {
    // Получаем настройки приватности галереи
    const { data: privacySettings } = await serviceClient
      .from('user_message_privacy')
      .select('who_can_view_gallery')
      .eq('user_id', profile.id)
      .maybeSingle();

    const whoCanViewGallery = privacySettings?.who_can_view_gallery || 'everyone';

    if (whoCanViewGallery === 'nobody') {
      notFound();
    }

    if (whoCanViewGallery === 'friends') {
      // Проверяем, являемся ли мы друзьями
      const user1_id = currentUser.id < profile.id ? currentUser.id : profile.id;
      const user2_id = currentUser.id < profile.id ? profile.id : currentUser.id;
      
      const { data: friendship } = await serviceClient
        .from('user_friends')
        .select('status')
        .or(`and(user_id.eq.${user1_id},friend_id.eq.${user2_id}),and(user_id.eq.${user2_id},friend_id.eq.${user1_id})`)
        .eq('status', 'accepted')
        .maybeSingle();
      
      if (!friendship) {
        notFound();
      }
    } else if (whoCanViewGallery === 'followers') {
      // Проверяем, подписан ли текущий пользователь
      const { data: follow } = await serviceClient
        .from('user_follows')
        .select('follower_id')
        .eq('follower_id', currentUser.id)
        .eq('followed_id', profile.id)
        .maybeSingle();
      
      if (!follow) {
        notFound();
      }
    }
    // Если whoCanViewGallery === 'everyone', доступ разрешен
  }

  // Получаем медиа из галереи
  const userGalleryResult = await serviceClient
    .from('user_gallery')
    .select('id, media_type, media_url, thumbnail_url, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1000);

  const allUserMedia = (userGalleryResult.data || []).map((media: any) => ({
    id: media.id,
    media_url: media.media_url,
    media_type: media.media_type,
    thumbnail_url: media.thumbnail_url,
    created_at: media.created_at,
  }));

  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.username || 'Пользователь';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок в стиле главной страницы */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
          {/* Кнопка назад */}
          <div className="mb-6">
            <Link
              href={`/users/${profile.username || profile.id}`}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
              aria-label="Назад к профилю"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-base font-medium">Назад к профилю</span>
            </Link>
          </div>

          {/* Бейдж */}
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1.5 bg-purple-100/50 border border-purple-200/50 rounded-xl">
              <span className="text-sm font-bold text-purple-700">Галерея</span>
            </div>
          </div>

          {/* Главный заголовок */}
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3">
              <ImageIcon className="w-7 h-7 md:w-8 md:h-8 text-purple-600" />
              Галерея {displayName}
            </h1>
          </div>

          {/* Статистика */}
          <p className="text-base md:text-lg text-gray-600 mb-6">
            {allUserMedia.length} {allUserMedia.length === 1 ? 'медиафайл' : allUserMedia.length < 5 ? 'медиафайла' : 'медиафайлов'}
          </p>
        </div>
      </div>

      {/* Галерея */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
          <Suspense fallback={<div className="text-center py-12">Загрузка галереи...</div>}>
            <UserGallery 
              media={allUserMedia} 
              userId={profile.id}
              isOwner={currentUser?.id === profile.id}
              username={profile.username || profile.id}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

