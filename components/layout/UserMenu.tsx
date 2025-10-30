'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, LogOut, Settings, Calendar, Shield } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function UserMenu() {
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Получаем текущего пользователя
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Сначала берём данные из user_metadata (быстро и надёжно)
        const metaProfile = {
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          avatar_url: user.user_metadata?.avatar_url,
          role: user.user_metadata?.role, // ✅ Добавляем роль!
        };
        setProfile(metaProfile);
        
        // Затем пытаемся загрузить из БД (если есть обновления)
        supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, role')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setProfile(data);
            }
            // Если ошибка RLS - используем данные из metadata (уже установлены выше)
          });
      }
    });

    // Подписка на изменения авторизации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // При изменении сессии обновляем из metadata
        setProfile({
          first_name: session.user.user_metadata?.first_name,
          last_name: session.user.user_metadata?.last_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: session.user.user_metadata?.role, // ✅ Добавляем роль!
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Если пользователь не авторизован
  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/auth"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Вход
        </Link>
      </div>
    );
  }

  // Если пользователь авторизован
  return (
    <div className="relative">
      {/* Кнопка профиля */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover border-2 border-emerald-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
            {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || ''}
          </div>
        )}
        <span className="hidden md:block font-medium text-gray-900">
          {profile?.first_name}
        </span>
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <>
          {/* Overlay для закрытия */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Меню */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Мой профиль</span>
            </Link>
            
            <Link
              href="/profile/bookings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Мои бронирования</span>
            </Link>
            
            <Link
              href="/profile/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Настройки</span>
            </Link>
            
            {/* Ссылка на админку (только для админов) */}
            {(profile?.role === 'super_admin' || profile?.role === 'tour_admin' || profile?.role === 'support_admin') && (
              <>
                <hr className="my-2" />
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-emerald-50 transition-colors text-emerald-600 font-medium"
                >
                  <Shield className="w-5 h-5" />
                  <span>Админ-панель</span>
                </Link>
              </>
            )}
            
            <hr className="my-2" />
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span>Выйти</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

