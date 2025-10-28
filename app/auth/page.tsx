import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthForm from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Вход и Регистрация | Tatarstan Tours',
  description: 'Войдите в свой аккаунт или создайте новый для бронирования туров',
};

export default async function AuthPage() {
  const supabase = await createClient();
  
  // Проверяем, авторизован ли пользователь
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Если авторизован - редирект на профиль
  if (user) {
    redirect('/profile');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 py-12 px-4 sm:px-6 lg:px-8">
      <AuthForm />
    </div>
  );
}

