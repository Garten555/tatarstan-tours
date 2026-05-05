'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getUserFromSession } from '@/lib/supabase/auth-quick-client';
import {
  PUSHER_BRIDGE_EVENT,
  type PusherBridgeDetail,
} from '@/lib/pusher/user-bridge-events';
import { User, LogOut, Settings, Calendar, Shield, Crown, MessageSquare, BookOpen, Compass, Search, Users, Home, Mail, DoorOpen, Volume2, VolumeX } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useDialog } from '@/hooks/useDialog';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sound/notifications';

export default function UserMenu() {
  const { alert, DialogComponents } = useDialog();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [authResolved, setAuthResolved] = useState(false); // чтобы не мигала кнопка "Вход"
  const [isGuide, setIsGuide] = useState(false); // Является ли пользователь гидом
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadTourRoomsCount, setUnreadTourRoomsCount] = useState(0);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const guideCheckedRef = useRef<string | null>(null); // ID пользователя, для которого уже проверено

  // Диагностика: единый префикс для логов
  const logPrefix = '[МенюПользователя]';

  const isAdminRole = (role: any) =>
    role === 'super_admin' || role === 'tour_admin' || role === 'support_admin';
  
  // Проверяем, является ли пользователь гидом по роли или по наличию комнат
  const isGuideByRole = profile?.role === 'guide' || profile?.role === 'tour_admin';

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
    // Логирование отключено для производительности
  }, [profile?.role, user?.email]);

  const loadUnreadMessagesCount = async () => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }
    try {
      const response = await fetch('/api/users/messages?summary=unread');
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.success) return;
      setUnreadMessagesCount(Number(data.unread_count || 0));
    } catch {
      // ignore
    }
  };

  const loadUnreadTourRoomsCount = async () => {
    if (!user) {
      setUnreadTourRoomsCount(0);
      return;
    }
    try {
      const response = await fetch('/api/notifications?mode=summary', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.success) return;
      setUnreadTourRoomsCount(Number(data?.summary?.tour_room_message || 0));
    } catch {
      // ignore
    }
  };

  /** Кэш профиля только для указанного user id — иначе после смены аккаунта тянулся чужой avatar_url. */
  const PROFILE_CACHE_KEY = 'tt_profile';
  const readCachedProfile = (forUserId?: string | null): any | null => {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY) || sessionStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown> & { _uid?: string };
      if (forUserId && parsed._uid && parsed._uid !== forUserId) return null;
      const { _uid: _drop, ...rest } = parsed;
      return rest;
    } catch {
      return null;
    }
  };
  const writeCachedProfile = (data: any, userId: string) => {
    try {
      const s = JSON.stringify({ ...data, _uid: userId });
      localStorage.setItem(PROFILE_CACHE_KEY, s);
      sessionStorage.setItem(PROFILE_CACHE_KEY, s);
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
    const hydrateProfileFromDb = (u: SupabaseUser) => {
      supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, role, username')
        .eq('id', u.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
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
                first_name: dbProfile.first_name ?? u.user_metadata?.first_name ?? '',
                last_name: dbProfile.last_name ?? u.user_metadata?.last_name ?? '',
                avatar_url: dbProfile.avatar_url ?? u.user_metadata?.avatar_url ?? null,
                role: keepAdmin ? prev?.role : (dbProfile.role ?? u.user_metadata?.role),
                username: dbProfile.username ?? u.user_metadata?.username ?? undefined,
              };
              writeCachedProfile(next, u.id);
              return next;
            });
          } else {
            const metaProfile = {
              first_name: u.user_metadata?.first_name,
              last_name: u.user_metadata?.last_name,
              avatar_url: u.user_metadata?.avatar_url ?? null,
              role: u.user_metadata?.role,
              username: u.user_metadata?.username,
            };
            setProfile(metaProfile);
            writeCachedProfile(metaProfile, u.id);
          }
        });
    };

    // getSession() — локально/из cookie, без лишнего round-trip к Auth API
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const initialUser = session?.user ?? null;
      setUser(initialUser);
      setAuthResolved(true);
      if (initialUser) {
        const cached = readCachedProfile(initialUser.id);
        if (
          cached &&
          (cached.role ||
            cached.first_name ||
            cached.last_name ||
            cached.avatar_url)
        ) {
          setProfile(cached);
        } else {
          // Показываем имя/аватар сразу из user_metadata (если есть),
          // а в БД синхронизируем позже.
          const fallback = {
            first_name: initialUser.user_metadata?.first_name,
            last_name: initialUser.user_metadata?.last_name,
            avatar_url: initialUser.user_metadata?.avatar_url ?? null,
            role: initialUser.user_metadata?.role,
            username: initialUser.user_metadata?.username,
          };
          setProfile(fallback);
          writeCachedProfile(fallback, initialUser.id);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sUser = session?.user ?? null;
      setUser(sUser);
      setAuthResolved(true);
      if (!sUser) {
        setProfile(null);
        try {
          localStorage.removeItem(PROFILE_CACHE_KEY);
          sessionStorage.removeItem(PROFILE_CACHE_KEY);
        } catch {}
        return;
      }
      const cachedProfile = readCachedProfile(sUser.id);
      if (
        cachedProfile &&
        (cachedProfile.role ||
          cachedProfile.first_name ||
          cachedProfile.last_name ||
          cachedProfile.avatar_url)
      ) {
        // Кэш достаточно заполнен — лишний запрос к profiles не делаем.
        setProfile(cachedProfile);
        return;
      }

      // Сразу показываем данные из user_metadata, чтобы шапка не "подвисала"
      // в ожидании запроса к БД.
      const fallback = {
        first_name: sUser.user_metadata?.first_name,
        last_name: sUser.user_metadata?.last_name,
        avatar_url: sUser.user_metadata?.avatar_url ?? null,
        role: sUser.user_metadata?.role,
        username: sUser.user_metadata?.username,
      };
      setProfile(fallback);
      writeCachedProfile(fallback, sUser.id);
      supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, role, username')
        .eq('id', sUser.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setProfile((prev: any) => {
              const keepAdmin = isAdminRole(prev?.role) && !isAdminRole((data as any).role);
              const next = {
                first_name: (data as any).first_name ?? sUser.user_metadata?.first_name ?? '',
                last_name: (data as any).last_name ?? sUser.user_metadata?.last_name ?? '',
                avatar_url: (data as any).avatar_url ?? sUser.user_metadata?.avatar_url ?? null,
                role: keepAdmin ? prev?.role : ((data as any).role ?? sUser.user_metadata?.role),
                username: (data as any).username ?? sUser.user_metadata?.username ?? undefined,
              };
              writeCachedProfile(next, sUser.id);
              return next;
            });
          } else {
            const fallback = {
              first_name: sUser.user_metadata?.first_name,
              last_name: sUser.user_metadata?.last_name,
              avatar_url: sUser.user_metadata?.avatar_url ?? null,
              role: sUser.user_metadata?.role,
              username: sUser.user_metadata?.username,
            };
            setProfile(fallback);
            writeCachedProfile(fallback, sUser.id);
          }
        });
    });

    const onVisible = async () => {
      if (document.hidden) return;
      const currentUser = await getUserFromSession(supabase);
      if (!currentUser) return;
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
                first_name: (data as any).first_name ?? currentUser.user_metadata?.first_name ?? '',
                last_name: (data as any).last_name ?? currentUser.user_metadata?.last_name ?? '',
                avatar_url: (data as any).avatar_url ?? currentUser.user_metadata?.avatar_url ?? null,
                role: keepAdmin ? prev?.role : ((data as any).role ?? currentUser.user_metadata?.role),
                username: (data as any).username ?? currentUser.user_metadata?.username ?? undefined,
              };
              writeCachedProfile(next, currentUser.id);
              return next;
            });
          }
        });
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => void onVisible(), 100);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const handleAvatarUpdate = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const newAvatarUrl = customEvent.detail?.url;
      if (!newAvatarUrl) return;
      const currentUser = await getUserFromSession(supabase);
      if (!currentUser) return;
      setProfile((prev: any) => {
        const updated = { ...prev, avatar_url: newAvatarUrl };
        writeCachedProfile(updated, currentUser.id);
        return updated;
      });
      supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, role')
        .eq('id', currentUser.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setProfile((prev: any) => {
              const next = {
                first_name: (data as any).first_name ?? currentUser.user_metadata?.first_name,
                last_name: (data as any).last_name ?? currentUser.user_metadata?.last_name,
                avatar_url: (data as any).avatar_url ?? currentUser.user_metadata?.avatar_url ?? null,
                role: (data as any).role ?? prev?.role,
              };
              writeCachedProfile(next, currentUser.id);
              return next;
            });
          }
        });
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
    };
  }, []);

  useEffect(() => {
    const checkIfGuide = async (userId: string) => {
      if (guideCheckedRef.current === userId) return;
      try {
        const cachedTime = localStorage.getItem('tt_is_guide_time');
        const cachedGuide = localStorage.getItem('tt_is_guide');
        const cachedUserId = localStorage.getItem('tt_is_guide_user_id');
        const now = Date.now();
        if (cachedUserId === userId && cachedTime && cachedGuide !== null) {
          const cacheAge = now - parseInt(cachedTime, 10);
          if (cacheAge < 5 * 60 * 1000) {
            setIsGuide(cachedGuide === 'true');
            guideCheckedRef.current = userId;
            return;
          }
        }
        const response = await fetch('/api/guide/rooms');
        const data = await response.json();
        const isGuideValue = data.success && data.rooms && data.rooms.length > 0;
        setIsGuide(isGuideValue);
        guideCheckedRef.current = userId;
        localStorage.setItem('tt_is_guide', String(isGuideValue));
        localStorage.setItem('tt_is_guide_time', now.toString());
        localStorage.setItem('tt_is_guide_user_id', userId);
      } catch (error) {
        console.error('Ошибка проверки гида:', error);
        guideCheckedRef.current = userId;
      }
    };

    if (user?.id && guideCheckedRef.current !== user.id) {
      void checkIfGuide(user.id);
    }
    if (!user?.id && guideCheckedRef.current !== null) {
      guideCheckedRef.current = null;
      setIsGuide(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      setUnreadTourRoomsCount(0);
      return;
    }

    loadUnreadMessagesCount();
    loadUnreadTourRoomsCount();

    const handleRefresh = () => {
      loadUnreadMessagesCount();
      loadUnreadTourRoomsCount();
    };
    window.addEventListener('messages:update', handleRefresh);
    window.addEventListener('notifications:update', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    const onPusherBridge = (ev: Event) => {
      const d = (ev as CustomEvent<PusherBridgeDetail>).detail;
      if (!d) return;
      if (d.channel === 'user' && d.event === 'new-message') handleRefresh();
      if (d.channel === 'notifications' && d.event === 'new-notification') handleRefresh();
    };
    window.addEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);

    return () => {
      window.removeEventListener('messages:update', handleRefresh);
      window.removeEventListener('notifications:update', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener(PUSHER_BRIDGE_EVENT, onPusherBridge);
    };
  }, [user?.id]);

  const handleSignOut = async () => {
    try {
      setIsOpen(false);

      localStorage.removeItem(PROFILE_CACHE_KEY);
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      localStorage.removeItem('tt_is_guide');
      localStorage.removeItem('tt_is_guide_time');
      localStorage.removeItem('tt_is_guide_user_id');

      // Сервер: сброс auth-cookies (клиентский signOut() к Auth API часто виснет без VPN)
      try {
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), 8000);
        await fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'include',
          signal: ac.signal,
        });
        clearTimeout(tid);
      } catch {
        /* сеть — всё равно чистим клиент и перезагружаем */
      }

      try {
        await Promise.race([
          supabase.auth.signOut({ scope: 'local' }),
          new Promise<void>((resolve) => setTimeout(resolve, 4000)),
        ]);
      } catch {
        /* ignore */
      }
      void supabase.auth.signOut({ scope: 'global' }).catch(() => {});

      setUser(null);
      setProfile(null);
      setIsGuide(false);
      guideCheckedRef.current = null;

      window.location.assign('/');
    } catch (error) {
      console.error('Ошибка выхода:', error);
      await alert('Ошибка при выходе. Попробуйте обновить страницу.', 'Ошибка', 'error');
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
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
            key={`${user?.id ?? ''}:${profile.avatar_url}`}
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
                href={
                  profile?.username?.trim()
                    ? `/users/${profile.username}`
                    : `/set-username?redirect=${encodeURIComponent('/passport')}`
                }
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
                href="/feed"
                prefetch={true}
                onClick={() => setIsOpen(false)}
                className="header-user-dropdown-item header-user-dropdown-item-emerald"
              >
                <div className="header-user-dropdown-icon-wrapper header-user-dropdown-icon-wrapper-emerald">
                  <MessageSquare className="header-user-dropdown-icon header-user-dropdown-icon-emerald" />
                </div>
                <span className="header-user-dropdown-text">Лента</span>
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
                {unreadMessagesCount > 0 && (
                  <span className="ml-auto inline-flex min-w-6 h-6 px-2 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
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
                {unreadTourRoomsCount > 0 && (
                  <span className="ml-auto inline-flex min-w-6 h-6 px-2 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                    {unreadTourRoomsCount > 99 ? '99+' : unreadTourRoomsCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Бронирования и настройки */}
            <div className="header-user-dropdown-section">
              <div className="header-user-dropdown-section-title">Управление</div>
              <button
                type="button"
                onClick={toggleSound}
                className="header-user-dropdown-item"
              >
                <div className="header-user-dropdown-icon-wrapper">
                  {soundEnabled ? (
                    <Volume2 className="header-user-dropdown-icon" />
                  ) : (
                    <VolumeX className="header-user-dropdown-icon" />
                  )}
                </div>
                <span className="header-user-dropdown-text">
                  {soundEnabled ? 'Звуки: включены' : 'Звуки: выключены'}
                </span>
              </button>

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

