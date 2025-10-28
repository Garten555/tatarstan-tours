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

  // Получаем данные профиля через SERVICE ROLE (обходим RLS для серверного компонента)
  const { createServiceClient } = await import('@/lib/supabase/server');
  const serviceSupabase = createServiceClient();
  
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // ДЕБАГ: выводим в консоль что получили
  console.log('User ID:', user.id);
  console.log('Profile data:', profile);
  console.log('Profile error:', profileError);
  console.log('User metadata:', user.user_metadata);

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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProfileContent profile={newProfile} user={user} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProfileContent profile={profile} user={user} />
      </div>
    </div>
  );
}

