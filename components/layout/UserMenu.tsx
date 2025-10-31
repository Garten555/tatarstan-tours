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
  const [authResolved, setAuthResolved] = useState(false); // чтобы не мигала кнопка "Вход"
  
  // Диагностика: единый префикс для логов
  const logPrefix = '[МенюПользователя]';

  const isAdminRole = (role: any) =>
    role === 'super_admin' || role === 'tour_admin' || role === 'support_admin';

  // Белый список админов по email (через NEXT_PUBLIC_ADMIN_EMAILS="a@b.com,c@d.com")
  const adminEmails: string[] = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Отдельный лог проверки на админа при каждом изменении роли
  useEffect(() => {
    const role = profile?.role;
    const email = user?.email?.toLowerCase();
    const isAdminByRole = isAdminRole(role);
    const isAdminByEmail = !!(email && adminEmails.includes(email));
    const isAdmin = isAdminByRole || isAdminByEmail;
    console.info(logPrefix, 'проверка админа', { роль: role, email, поРоли: isAdminByRole, поEmail: isAdminByEmail, админ: isAdmin });
    // Дублируем в серверные логи (IDE/терминал)
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'UserMenu', level: 'info', message: 'admin check', data: { role, email, isAdminByRole, isAdminByEmail, isAdmin } }),
    }).catch(() => {});
  }, [profile?.role, user?.email]);

  // Хелперы кэша
  const readCachedProfile = (): any | null => {
    try {
      const raw = localStorage.getItem('tt_profile') || sessionStorage.getItem('tt_profile');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      console.debug(logPrefix, 'чтение кэша профиля', { существует: !!raw, данные: parsed });
      return parsed;
    } catch {
      console.warn(logPrefix, 'ошибка парсинга JSON при чтении кэша профиля');
      return null;
    }
  };
  const writeCachedProfile = (data: any) => {
    try {
      const s = JSON.stringify(data);
      localStorage.setItem('tt_profile', s);
      sessionStorage.setItem('tt_profile', s);
      console.debug(logPrefix, 'запись кэша профиля', { данные: data });
    } catch {}
  };

  useEffect(() => {
    // Быстрый старт из localStorage, чтобы ссылка Админ-панель не пропадала при пробуждении вкладки
    const cached = readCachedProfile();
    if (cached && (cached.role || cached.first_name || cached.last_name)) {
      setProfile(cached);
      console.info(logPrefix, 'инициализация из кэша', { роль: cached.role });
    }

    // Получаем текущего пользователя
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      console.info(logPrefix, 'получен пользователь', { пользователь: !!user, userId: user?.id });
      fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: 'UserMenu', level: 'info', message: 'getUser', data: { hasUser: !!user, userId: user?.id } }) }).catch(() => {});
      if (user) {
        // Сначала берём данные из user_metadata (быстро и надёжно)
        const metaProfile = {
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          avatar_url: user.user_metadata?.avatar_url,
          role: user.user_metadata?.role, // ✅ Добавляем роль!
        };
        setProfile(metaProfile);
        // Кэшируем
        writeCachedProfile(metaProfile);
        console.info(logPrefix, 'роль из user_metadata применена', { роль: metaProfile.role });
        fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: 'UserMenu', level: 'info', message: 'meta role applied', data: { role: metaProfile.role } }) }).catch(() => {});
        
        // Затем пытаемся загрузить из БД (если есть обновления)
        supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, role')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            console.debug(logPrefix, 'результат загрузки профиля из БД', { естьДанные: !!data, ошибка: error });
            fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: 'UserMenu', level: 'debug', message: 'db profile fetch', data: { hasData: !!data, error } }) }).catch(() => {});
            if (!error && data) {
              // Не понижаем привилегии, если в метаданных/кэше роль админская, а в БД нет
              setProfile((prev: any) => {
                const keepAdmin = isAdminRole(prev?.role) && !isAdminRole((data as any).role);
                const next = {
                  first_name: (data as any).first_name ?? prev?.first_name,
                  last_name: (data as any).last_name ?? prev?.last_name,
                  avatar_url: (data as any).avatar_url ?? prev?.avatar_url,
                  role: keepAdmin ? prev?.role : ((data as any).role ?? prev?.role),
                };
                if (keepAdmin) {
                  console.warn(logPrefix, 'понижение роли из БД проигнорировано', { былаРоль: prev?.role, рольБД: (data as any).role });
                  fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: 'UserMenu', level: 'warn', message: 'db role downgrade ignored', data: { prevRole: prev?.role, dbRole: (data as any).role } }) }).catch(() => {});
                }
                writeCachedProfile(next);
                console.info(logPrefix, 'профиль из БД применён', { роль: next.role });
                fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag: 'UserMenu', level: 'info', message: 'db role applied', data: { role: next.role } }) }).catch(() => {});
                return next;
              });
            }
            // Если ошибка RLS - используем данные из metadata (уже установлены выше)
          });
      }
      setAuthResolved(true);
      console.debug(logPrefix, 'состояние аутентификации определено (getUser)');
    });

    // Подписка на изменения авторизации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      console.info(logPrefix, 'изменение состояния авторизации', { событие: _event, естьПользователь: !!session?.user });
      if (session?.user) {
        // При изменении сессии обновляем из metadata
        setProfile({
          first_name: session.user.user_metadata?.first_name,
          last_name: session.user.user_metadata?.last_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: session.user.user_metadata?.role, // ✅ Добавляем роль!
        });
        writeCachedProfile({
          first_name: session.user.user_metadata?.first_name,
          last_name: session.user.user_metadata?.last_name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: session.user.user_metadata?.role,
        });
        console.info(logPrefix, 'роль из метаданных сессии применена', { роль: session.user.user_metadata?.role });
      }
      setAuthResolved(true);
      console.debug(logPrefix, 'состояние аутентификации определено (onAuthStateChange)');
    });

    // При возврате на вкладку подхватываем кэш немедленно
    const onVisible = () => {
      const c = readCachedProfile();
      if (c && (c.role || c.first_name || c.last_name)) {
        setProfile((prev: any) => {
          const next = prev?.role ? prev : c;
          console.debug(logPrefix, 'применение кэша при возврате во вкладку', { предыдущаяРоль: prev?.role, следующаяРоль: next?.role });
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Пока не знаем состояние (и нет кэша) — ничего не показываем, чтобы не мигал "Вход"
  if (!authResolved && !profile) {
    console.debug(logPrefix, 'рендер: плейсхолдер (аутентификация не определена, профиля нет)');
    return <div className="w-24 h-10" />;
  }

  const isAuthorizedByCache = !!profile?.role;
  const isAdmin = isAdminRole(profile?.role) || !!(user?.email && adminEmails.includes(user.email.toLowerCase()));
  // Если пользователь не авторизован и нет кэша роли — показываем Вход
  if (!user && !isAuthorizedByCache) {
    console.debug(logPrefix, 'рендер: показать кнопку входа', { пользователь: !!user, естьКэшРоли: isAuthorizedByCache, админ: isAdmin });
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
  console.debug(logPrefix, 'рендер: меню пользователя', { роль: profile?.role, пользователь: !!user, админ: isAdmin });
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
            {isAdmin && (
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

