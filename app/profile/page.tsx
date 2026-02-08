import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileContent from '@/components/profile/ProfileContent';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Мой профиль | Туры по Татарстану',
  description: 'Управление профилем и настройками аккаунта',
};

interface ProfilePageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const supabase = await createClient();
  const { id: targetUserId } = await searchParams;

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Проверяем, не забанен ли текущий пользователь (если смотрим свой профиль)
  if (!targetUserId || targetUserId === user.id) {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const serviceSupabase = createServiceClient();
    
    const { data: currentUserProfile } = await serviceSupabase
      .from('profiles')
      .select('is_banned, ban_until')
      .eq('id', user.id)
      .single();

    if (currentUserProfile?.is_banned) {
      // Проверяем, не истёк ли срок бана
      if (currentUserProfile.ban_until) {
        const until = new Date(currentUserProfile.ban_until);
        if (until.getTime() > Date.now()) {
          // Бан ещё действует - редирект на страницу бана
          redirect('/banned');
        }
      } else {
        // Постоянный бан - редирект на страницу бана
        redirect('/banned');
      }
    }
  }

  // Получаем данные профиля через SERVICE ROLE (обходим RLS для серверного компонента)
  // Оптимизировано: выбираем только нужные поля вместо select('*')
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceSupabase = createServiceClient();
  
  // Определяем, какой профиль загружать
  let profileUserId = user.id;
  let isViewingOtherProfile = false;
  
  // Если передан ID и текущий пользователь - админ, загружаем профиль этого пользователя
  if (targetUserId && targetUserId !== user.id) {
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    const currentUserRole = (currentUserProfile as { role?: string } | null)?.role;
    const isAdmin = currentUserRole ? ['tour_admin', 'support_admin', 'super_admin'].includes(currentUserRole) : false;
    
    if (isAdmin) {
      profileUserId = targetUserId;
      isViewingOtherProfile = true;
    }
  }
  
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('id, email, first_name, last_name, middle_name, phone, role, avatar_url, avatar_path, username, is_banned, banned_at, ban_reason, ban_until, created_at, updated_at')
    .eq('id', profileUserId)
    .single();

  // Если профиля нет - создаём его вручную через service role
  if (!profile && !profileError?.message.includes('multiple')) {
    console.log('Создаём профиль вручную...');
    
    // Используем service role для обхода RLS
    const { createServiceClient } = await import('@/lib/supabase/server');
    const serviceSupabase = createServiceClient();
    
    const { data: newProfile, error: insertError } = await serviceSupabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        first_name: user.user_metadata?.first_name || 'Имя',
        last_name: user.user_metadata?.last_name || 'Фамилия',
        middle_name: user.user_metadata?.middle_name || null,
        role: 'user',
      } as any)
      .select()
      .single();
    
    console.log('Insert result:', newProfile);
    console.log('Insert error:', insertError);

    return (
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-all duration-200 group mb-6"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold text-base md:text-lg">На главную</span>
          </Link>
          <ProfileContent profile={newProfile} user={user} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-all duration-200 group mb-6"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-base md:text-lg">На главную</span>
        </Link>
        {isViewingOtherProfile && (
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-all duration-200 group mb-4"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold text-base md:text-lg">Назад к списку пользователей</span>
          </Link>
        )}
        <ProfileContent profile={profile} user={user} isViewMode={isViewingOtherProfile} />
      </div>
    </main>
  );
}
