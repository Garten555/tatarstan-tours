import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthForm from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Вход и Регистрация | Туры по Татарстану',
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50 pt-20 sm:pt-24 md:pt-28 lg:pt-32 pb-6 sm:pb-12 px-4 sm:px-6 lg:px-8">
      {/* Декоративные элементы фона */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-100/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10">
        <AuthForm />
      </div>
    </div>
  );
}

