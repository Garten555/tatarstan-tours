// Редирект на публичный профиль (туристический паспорт)
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PassportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirect=/passport');
  }

  // Получаем username пользователя
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceClient = createServiceClient();
  
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('username, public_profile_enabled')
    .eq('id', user.id)
    .single();

  // Если есть username и публичный профиль включен - редиректим на публичный профиль
  if (profile?.username && profile?.public_profile_enabled) {
    redirect(`/users/${profile.username}`);
  }

  // Если нет username или публичный профиль не включен - редиректим в настройки
  redirect('/profile/settings');
}




















