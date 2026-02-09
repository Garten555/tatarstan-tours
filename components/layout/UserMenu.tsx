'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, LogOut, Settings, Calendar, Shield, BookOpen, Users, Mail, DoorOpen } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useDialog } from '@/hooks/useDialog';

export default function UserMenu() {
  const router = useRouter();
  const supabase = createClient();
  const { alert, DialogComponents } = useDialog();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [authResolved, setAuthResolved] = useState(false); // чтобы не мигала кнопка "Вход"
  const [isGuide, setIsGuide] = useState(false); // Является ли пользователь гидом
  const guideCheckedRef = useRef<string | null>(null); // ID пользователя, для которого уже проверено

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
    // Логирование отключено для производительности
    // isAdmin вычисляется, но не используется (закомментировано для будущего использования)
    void (isAdminByRole || isAdminByEmail);
  }, [profile?.role, user?.email, adminEmails]);

  // Хелперы кэша
  const readCachedProfile = (): any | null => {
    try {
      const raw = localStorage.getItem('tt_profile') || sessionStorage.getItem('tt_profile');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      // Тихая обработка ошибки парсинга кэша (не критично)
      return null;
    }
  };
  const writeCachedProfile = (data: any) => {
    try {
      const s = JSON.stringify(data);
      localStorage.setItem('tt_profile', s);
      sessionStorage.setItem('tt_profile', s);
    } catch {}
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.source !== 'user-menu') {
        setTimeout(() => setIsOpen(false), 0);
      }
    };
    window.addEventListener('ui:dropdown', handler as EventListener);
    return () => window.removeEventListener('ui:dropdown', handler as EventListener);
  }, []);

  // Закрытие при клике вне компонента
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const userMenuButton = target.closest('[data-user-menu-button]');
      const userMenuDropdown = target.closest('[data-user-menu]');
      
      if (!userMenuButton && !userMenuDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    // Быстрый старт из localStorage, чтобы ссылка Админ-панель не пропадала при пробуждении вкладки
    const cached = readCachedProfile();
      if (cached && (cached.role || cached.first_name || cached.last_name)) {
        // Используем setTimeout для избежания синхронного setState в эффекте
        setTimeout(() => {
          setProfile(cached);
        }, 0);
      }

    // Получаем текущего пользователя
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Сначала загружаем из БД (приоритет для актуальных данных, особенно avatar_url)
        supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, role, username')
          .eq('id', user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              // Используем данные из БД как основной источник
              const dbProfile = {
                first_name: (data as any).first_name,
                last_name: (data as any).last_name,
                avatar_url: (data as any).avatar_url,
                role: (data as any).role,
                username: (data as any).username,
              };
              
              setProfile((prev: any) => {
                const keepAdmin = isAdminRole(prev?.role) && !isAdminRole(dbProfile.role);
                const next = {
                  first_name: dbProfile.first_name ?? prev?.first_name ?? user.user_metadata?.first_name,
                  last_name: dbProfile.last_name ?? prev?.last_name ?? user.user_metadata?.last_name,
                  // Всегда приоритет avatar_url из БД
                  avatar_url: dbProfile.avatar_url ?? prev?.avatar_url ?? user.user_metadata?.avatar_url,
                  role: keepAdmin ? prev?.role : (dbProfile.role ?? prev?.role ?? user.user_metadata?.role),
                  username: dbProfile.username ?? prev?.username,
                };
                writeCachedProfile(next);
                return next;
              });
            } else {
              // Если ошибка RLS - используем данные из metadata как fallback
              const metaProfile = {
                first_name: user.user_metadata?.first_name,
                last_name: user.user_metadata?.last_name,
                avatar_url: user.user_metadata?.avatar_url,
                role: user.user_metadata?.role,
              };
              setProfile((prev: any) => {
                // Не перезаписываем, если уже есть данные из кэша
                if (prev?.role || prev?.first_name) {
                  return {
                    ...prev,
                    avatar_url: prev.avatar_url ?? metaProfile.avatar_url,
                  };
                }
                return metaProfile;
              });
              writeCachedProfile(metaProfile);
            }
          });
      }
      setAuthResolved(true);
    });

    // Подписка на изменения авторизации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // При изменении сессии перезагружаем профиль из БД для получения актуальных данных
        // Используем кэш для быстрого старта
        const cachedProfile = readCachedProfile();
        if (cachedProfile && cachedProfile.role) {
          setProfile(cachedProfile);
        }
        
        // Загружаем из БД в фоне (не блокируем UI)
        supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, role, username')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setProfile((prev: any) => {
                const keepAdmin = isAdminRole(prev?.role) && !isAdminRole((data as any).role);
                const next = {
                  first_name: (data as any).first_name ?? prev?.first_name ?? session.user.user_metadata?.first_name,
                  last_name: (data as any).last_name ?? prev?.last_name ?? session.user.user_metadata?.last_name,
                  // Всегда приоритет avatar_url из БД
                  avatar_url: (data as any).avatar_url ?? prev?.avatar_url ?? session.user.user_metadata?.avatar_url,
                  role: keepAdmin ? prev?.role : ((data as any).role ?? prev?.role ?? session.user.user_metadata?.role),
                  username: (data as any).username ?? prev?.username,
                };
                writeCachedProfile(next);
                return next;
              });
            } else {
              // Fallback на user_metadata только если БД недоступна
              setProfile((prev: any) => {
                // Не перезаписываем аватар, если он уже есть
                if (prev?.avatar_url && !session.user.user_metadata?.avatar_url) {
                  return {
                    ...prev,
                    first_name: session.user.user_metadata?.first_name ?? prev?.first_name,
                    last_name: session.user.user_metadata?.last_name ?? prev?.last_name,
                    role: session.user.user_metadata?.role ?? prev?.role,
                  };
                }
                return {
                  first_name: session.user.user_metadata?.first_name,
                  last_name: session.user.user_metadata?.last_name,
                  avatar_url: session.user.user_metadata?.avatar_url ?? prev?.avatar_url,
                  role: session.user.user_metadata?.role,
                };
              });
              writeCachedProfile({
                first_name: session.user.user_metadata?.first_name,
                last_name: session.user.user_metadata?.last_name,
                avatar_url: session.user.user_metadata?.avatar_url,
                role: session.user.user_metadata?.role,
              });
            }
          });
      }
      setAuthResolved(true);
    });

    // При возврате на вкладку перезагружаем профиль из БД для синхронизации
    const onVisible = async () => {
      // Не перезагружаем, если вкладка только что стала видимой (может быть ложное срабатывание)
      if (document.hidden) return;
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        // Перезагружаем профиль из БД для получения актуальных данных (особенно avatar_url)
        supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url, role, username')
          .eq('id', currentUser.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setProfile((prev: any) => {
                const keepAdmin = isAdminRole(prev?.role) && !isAdminRole((data as any).role);
                const next = {
                  first_name: (data as any).first_name ?? prev?.first_name,
                  last_name: (data as any).last_name ?? prev?.last_name,
                  // Всегда используем avatar_url из БД при возврате на вкладку
                  avatar_url: (data as any).avatar_url ?? prev?.avatar_url,
                  role: keepAdmin ? prev?.role : ((data as any).role ?? prev?.role),
                  username: (data as any).username ?? prev?.username,
                };
                writeCachedProfile(next);
                return next;
              });
            }
          });
      }
    };
    
    // Используем только visibilitychange для избежания множественных срабатываний
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Небольшая задержка для избежания ложных срабатываний
        setTimeout(onVisible, 100);
      }
    });

    // Слушаем событие обновления аватара
    const handleAvatarUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const newAvatarUrl = customEvent.detail?.url;
      if (newAvatarUrl) {
        // Обновляем профиль с новым аватаром
        setProfile((prev: any) => {
          const updated = { ...prev, avatar_url: newAvatarUrl };
          writeCachedProfile(updated);
          return updated;
        });
        
        // Также перезагружаем профиль из БД для синхронизации
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, role')
            .eq('id', currentUser.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                setProfile((prev: any) => {
                  const next = {
                    first_name: (data as any).first_name ?? prev?.first_name,
                    last_name: (data as any).last_name ?? prev?.last_name,
                    avatar_url: (data as any).avatar_url ?? prev?.avatar_url,
                    role: (data as any).role ?? prev?.role,
                  };
                  writeCachedProfile(next);
                  return next;
                });
              }
            });
        }
      }
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);

    // Проверяем, является ли пользователь гидом (только один раз для каждого пользователя)
    const checkIfGuide = async (userId: string) => {
      // Если уже проверено для этого пользователя - пропускаем
      if (guideCheckedRef.current === userId) return;
      
      try {
        // Проверяем кэш
        const cachedTime = localStorage.getItem('tt_is_guide_time');
        const cachedGuide = localStorage.getItem('tt_is_guide');
        const cachedUserId = localStorage.getItem('tt_is_guide_user_id');
        const now = Date.now();
        
        // Если кэш для этого пользователя свежий (менее 5 минут) - используем его
        if (cachedUserId === userId && cachedTime && cachedGuide !== null) {
          const cacheAge = now - parseInt(cachedTime);
          if (cacheAge < 5 * 60 * 1000) {
            setIsGuide(cachedGuide === 'true');
            guideCheckedRef.current = userId; // Помечаем как проверенное
            return;
          }
        }
        
        // Загружаем только если нет свежего кэша
        const response = await fetch('/api/guide/rooms');
        const data = await response.json();
        const isGuideValue = data.success && data.rooms && data.rooms.length > 0;
        setIsGuide(isGuideValue);
        guideCheckedRef.current = userId; // Помечаем как проверенное
        
        // Кэшируем результат на 5 минут
        localStorage.setItem('tt_is_guide', String(isGuideValue));
        localStorage.setItem('tt_is_guide_time', now.toString());
        localStorage.setItem('tt_is_guide_user_id', userId);
      } catch (error) {
        console.error('Ошибка проверки гида:', error);
        guideCheckedRef.current = userId; // Помечаем как проверенное даже при ошибке
      }
    };
    
    // Проверяем только один раз при появлении нового пользователя
    if (user && guideCheckedRef.current !== user.id) {
      checkIfGuide(user.id);
    }
    
    // Сбрасываем флаг при смене пользователя
    if (!user && guideCheckedRef.current !== null) {
      guideCheckedRef.current = null;
      setIsGuide(false);
    }

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, [supabase, user?.id]); // Зависимость только от user.id

  const handleSignOut = async () => {
    try {
      setIsOpen(false); // Закрываем меню
      
      // Очищаем кэш
      localStorage.removeItem('tt_profile');
      sessionStorage.removeItem('tt_profile');
      localStorage.removeItem('tt_is_guide');
      localStorage.removeItem('tt_is_guide_time');
      localStorage.removeItem('tt_is_guide_user_id');
      
      // Выход из Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Ошибка выхода:', error);
        await alert('Ошибка при выходе. Попробуйте обновить страницу.', 'Ошибка', 'error');
        return;
      }
      
      // Сбрасываем состояние
      setUser(null);
      setProfile(null);
      setIsGuide(false);
      guideCheckedRef.current = null;
      
      // Перенаправляем на главную
      router.push('/');
      router.refresh();
      
      // Принудительная перезагрузка для очистки всех данных
      window.location.href = '/';
    } catch (error) {
      console.error('Ошибка выхода:', error);
      await alert('Ошибка при выходе. Попробуйте обновить страницу.', 'Ошибка', 'error');
    }
  };

  // Пока не знаем состояние (и нет кэша) — ничего не показываем, чтобы не мигал "Вход"
  if (!authResolved && !profile) {
    return <div className="w-24 h-10" />;
  }

  const isAuthorizedByCache = !!profile?.role;
  const isAdmin = isAdminRole(profile?.role) || !!(user?.email && adminEmails.includes(user.email.toLowerCase()));
  // Определяем, показывать ли панель гида: либо по роли, либо по наличию комнат
  const showGuidePanel = (profile?.role === 'guide' || profile?.role === 'tour_admin') || isGuide;
  // Если пользователь не авторизован и нет кэша роли — показываем Вход
  if (!user && !isAuthorizedByCache) {
    return (
      <Link
        href="/auth"
        className="header-auth-button"
      >
        Вход
      </Link>
    );
  }

  // Если пользователь авторизован
  return (
    <div className="header-user-menu">
      {/* Кнопка профиля */}
      <button
        data-user-menu-button
        onMouseDown={() => {
          window.dispatchEvent(
            new CustomEvent('ui:dropdown', { detail: { source: 'user-menu' } })
          );
        }}
        onClick={() => setIsOpen((prev) => !prev)}
        className="header-user-button"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Avatar"
            className="header-user-avatar"
          />
        ) : (
          <div className="header-user-avatar header-user-avatar-placeholder">
            {profile?.first_name?.[0] || 'U'}{profile?.last_name?.[0] || ''}
          </div>
        )}
        <span className="header-user-name">
          {profile?.first_name || 'Пользователь'}
        </span>
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <>
          {/* Overlay для закрытия */}
          <div
            className="header-user-overlay"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Меню */}
          <div className="header-user-dropdown" data-user-menu>
            {/* Профиль */}
            <div className="header-user-dropdown-section">
              <Link
                href="/profile"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item"
              >
                <div className="header-user-dropdown-icon-wrapper">
                  <User className="header-user-dropdown-icon" />
                </div>
                <span className="header-user-dropdown-text">Мой профиль</span>
              </Link>
            </div>

            {/* Социальные функции */}
            <div className="header-user-dropdown-section">
              <div className="header-user-dropdown-section-title">Социальные</div>
              <Link
                href={`/users/${profile?.username || user?.id}`}
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item header-user-dropdown-item-emerald"
              >
                <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-emerald">
                  <BookOpen className="header-user-dropdown-icon header-user-dropdown-icon-emerald" />
                </div>
                <span className="header-user-dropdown-text">Мой туристический паспорт</span>
              </Link>
              
              <Link
                href="/messenger"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item header-user-dropdown-item-emerald"
              >
                <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-emerald">
                  <Mail className="header-user-dropdown-icon header-user-dropdown-icon-emerald" />
                </div>
                <span className="header-user-dropdown-text">Мессенджер</span>
              </Link>
              
              <Link
                href="/friends"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item header-user-dropdown-item-emerald"
              >
                <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-emerald">
                  <Users className="header-user-dropdown-icon header-user-dropdown-icon-emerald" />
                </div>
                <span className="header-user-dropdown-text">Друзья</span>
              </Link>
              
              <Link
                href="/my-rooms"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item header-user-dropdown-item-emerald"
              >
                <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-emerald">
                  <DoorOpen className="header-user-dropdown-icon header-user-dropdown-icon-emerald" />
                </div>
                <span className="header-user-dropdown-text">Мои комнаты</span>
              </Link>
            </div>

            {/* Бронирования и настройки */}
            <div className="header-user-dropdown-section">
              <div className="header-user-dropdown-section-title">Управление</div>
              <Link
                href="/profile/bookings"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item"
              >
                <div className="header-user-dropdown-icon-wrapper">
                  <Calendar className="header-user-dropdown-icon" />
                </div>
                <span className="header-user-dropdown-text">Мои бронирования</span>
              </Link>
              
              <Link
                href="/profile/settings"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item"
              >
                <div className="header-user-dropdown-icon-wrapper">
                  <Settings className="header-user-dropdown-icon" />
                </div>
                <span className="header-user-dropdown-text">Настройки</span>
              </Link>
            </div>
            
            {/* Админ-панель (для админов и гидов) */}
            {(isAdmin || showGuidePanel) && (
              <div className="header-user-dropdown-section">
                <div className="header-user-dropdown-section-title">Администрирование</div>
                {/* Комнаты туров только для гидов (не админов), так как у админов есть админ-панель */}
                {showGuidePanel && !isAdmin && (
                  <Link
                    href="/admin/tour-rooms"
                    onClick={() => setIsOpen(false)}
                    className="header-user-dropdown-item header-user-dropdown-item-admin"
                  >
                    <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-emerald">
                      <DoorOpen className="header-user-dropdown-icon header-user-dropdown-icon-emerald" />
                    </div>
                    <span className="header-user-dropdown-text">Комнаты туров</span>
                  </Link>
                )}
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="header-user-dropdown-item header-user-dropdown-item-admin"
                >
                  <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-emerald">
                    <Shield className="header-user-dropdown-icon header-user-dropdown-icon-emerald" />
                  </div>
                  <span className="header-user-dropdown-text">Админ-панель</span>
                </Link>
              </div>
            )}
            
            {/* Выход */}
            <div className="header-user-dropdown-section">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSignOut();
                }}
                className="header-user-dropdown-item header-user-dropdown-item-danger"
              >
                <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-danger">
                  <LogOut className="header-user-dropdown-icon header-user-dropdown-icon-danger" />
                </div>
                <span className="header-user-dropdown-text">Выйти</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Диалоги */}
      {DialogComponents}
    </div>
  );
}

