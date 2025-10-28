import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileContent from '@/components/profile/ProfileContent';

export const metadata = {
  title: 'Мой профиль | Tatarstan Tours',
  description: 'Управление профилем и настройками аккаунта',
};

export default async function ProfilePage() {
  const supabase = await createClient();

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Получаем данные профиля
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileContent profile={profile} user={user} />
      </div>
    </div>
  );
}

