'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Map, 
  Calendar, 
  MessageSquare, 
  Users, 
  Star,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Crown,
  Award,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, Fragment } from 'react';

interface AdminSidebarProps {
  userRole: string;
  userName: string;
  avatarUrl?: string | null;
}

export default function AdminSidebar({ userRole, userName, avatarUrl }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  // Состояние сайдбара (открыт/закрыт)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Загружаем состояние из localStorage при монтировании
  useEffect(() => {
    const savedState = localStorage.getItem('adminSidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Сохраняем состояние в localStorage при изменении
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('adminSidebarCollapsed', String(newState));
  };

  // Навигационные элементы
  const navigation = [
    {
      name: 'Панель управления',
      href: userRole === 'guide' ? '/admin/guide-dashboard' : userRole === 'support_admin' ? '/admin/moderator-dashboard' : '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'tour_admin', 'support_admin', 'guide'],
    },
    {
      name: 'Мои туры',
      href: '/admin/my-tours',
      icon: Crown,
      roles: ['guide'],
    },
    {
      name: 'Выдача достижений',
      href: '/admin/award-achievements',
      icon: Award,
      roles: ['guide', 'tour_admin', 'super_admin'],
    },
    {
      name: 'Туры',
      href: '/admin/tours',
      icon: Map,
      roles: ['super_admin', 'tour_admin'],
    },
    {
      name: 'Бронирования',
      href: '/admin/bookings',
      icon: Calendar,
      roles: ['super_admin', 'tour_admin'],
    },
    {
      name: 'Комнаты туров',
      href: '/admin/tour-rooms',
      icon: DoorOpen,
      roles: ['super_admin', 'tour_admin', 'support_admin'],
    },
    {
      name: 'Отзывы',
      href: '/admin/reviews',
      icon: Star,
      roles: ['super_admin', 'tour_admin', 'support_admin'],
    },
    {
      name: 'Чат поддержки',
      href: '/admin/chat',
      icon: MessageSquare,
      roles: ['super_admin', 'support_admin'],
    },
    {
      name: 'Пользователи',
      href: '/admin/users',
      icon: Users,
      roles: ['super_admin', 'support_admin'],
    },
    {
      name: 'Апелляции на бан',
      href: '/admin/ban-appeals',
      icon: AlertCircle,
      roles: ['super_admin', 'support_admin'],
    },
  ];

  // Фильтруем навигацию по роли
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  // Обработчик выхода
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Перевод ролей
  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      'super_admin': 'Супер Админ',
      'tour_admin': 'Админ туров',
      'support_admin': 'Модератор',
      'guide': 'Гид',
      'user': 'Пользователь',
    };
    return roles[role] || role;
  };

  return (
    <Fragment>
      {/* Toggle Button - Completely outside sidebar */}
      <button
        onClick={toggleSidebar}
        className={`fixed bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-110 border-2 border-white/30 group ${
          isCollapsed 
            ? 'top-2 sm:top-3 left-[4.5rem] sm:left-[5.5rem] w-8 h-8 sm:w-10 sm:h-10' 
            : 'top-4 sm:top-6 left-[15.75rem] sm:left-[17.75rem] w-7 h-7 sm:w-9 sm:h-9'
        }`}
        style={{ zIndex: 10000 }}
        title={isCollapsed ? 'Развернуть' : 'Свернуть'}
        aria-label={isCollapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-0.5 text-white" />
        ) : (
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:-translate-x-0.5 text-white" />
        )}
      </button>

      {/* Sidebar */}
      <div 
        className={`sticky top-0 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white flex flex-col h-screen transition-all duration-300 relative flex-shrink-0 shadow-2xl z-50 ${
          isCollapsed ? 'w-16 sm:w-20' : 'w-64 sm:w-72'
        }`}
      >
        {/* Header with Logo */}
        <div className="border-b border-gray-800/50 flex-shrink-0 relative bg-gradient-to-r from-gray-900 to-gray-800/50 backdrop-blur-sm">
          <div className="relative h-full">
            {/* Logo */}
            {!isCollapsed && (
              <div className="p-4 sm:p-6">
                <h1 className="text-xl sm:text-2xl font-black text-white">Админ панель</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Туры по Татарстану</p>
              </div>
            )}
          </div>
        </div>

      {/* User info */}
      {!isCollapsed && (
        <div className="p-3 sm:p-4 md:p-5 border-b border-gray-800/50 flex-shrink-0 bg-gradient-to-r from-gray-800/30 to-transparent">
          <div className="flex items-center gap-3 sm:gap-4">
            {avatarUrl ? (
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl object-cover border-2 sm:border-[3px] border-emerald-500/80 flex-shrink-0 shadow-lg"
                />
                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-base sm:text-lg md:text-xl font-black flex-shrink-0 border-2 sm:border-[3px] border-emerald-400/80 shadow-lg">
                  {userName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-2 border-gray-900"></div>
              </div>
            )}
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm sm:text-base font-black text-white truncate mb-0.5 sm:mb-1">{userName}</p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="px-1.5 sm:px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-md sm:rounded-lg">
                  <p className="text-[10px] sm:text-xs font-bold text-emerald-400 truncate">
                    {getRoleLabel(userRole)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 p-2 sm:p-3 md:p-4 space-y-1.5 sm:space-y-2 admin-sidebar-nav overflow-y-auto overflow-x-hidden relative z-0 ${isCollapsed ? 'px-2 sm:px-2.5' : ''}`}>
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 relative group no-underline ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:scale-[1.01]'
              } ${isCollapsed ? 'justify-center w-full' : ''}`}
              style={!isActive ? { color: 'rgb(209 213 219)' } : undefined}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? 'text-white scale-110' : 'text-gray-300 group-hover:text-white group-hover:scale-110'}`} style={!isActive ? { color: 'rgb(209 213 219)' } : undefined} />
              {!isCollapsed && (
                <span className="text-xs sm:text-sm font-bold truncate flex-1" style={!isActive ? { color: 'rgb(209 213 219)' } : undefined}>{item.name}</span>
              )}
              
              {/* Активный индикатор */}
              {isActive && !isCollapsed && (
                <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"></div>
              )}
              
              {/* Tooltip при свёрнутом сайдбаре */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-xl border border-gray-700 pointer-events-none">
                  {item.name}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-t-transparent border-r-4 border-r-gray-800 border-b-4 border-b-transparent"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions - Always visible */}
      <div className={`p-2 sm:p-3 md:p-4 border-t-2 border-gray-800/50 space-y-2 sm:space-y-2.5 flex-shrink-0 bg-gradient-to-t from-gray-900/95 to-gray-900/80 backdrop-blur-sm ${isCollapsed ? 'px-2 sm:px-2.5' : ''}`}>
        <Link
          href="/"
          className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600/90 to-blue-700/90 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 relative group hover:scale-[1.02] no-underline border-2 border-blue-500/50 hover:border-blue-400 shadow-lg hover:shadow-xl font-bold ${
            isCollapsed ? 'justify-center w-full' : ''
          }`}
          title={isCollapsed ? 'На главную' : ''}
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: 'white' }} />
          {!isCollapsed && (
            <span className="text-sm sm:text-base font-bold truncate" style={{ color: 'white' }}>На главную</span>
          )}
          
          {/* Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-xl border border-gray-700 pointer-events-none">
              На главную
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-t-transparent border-r-4 border-r-gray-800 border-b-4 border-b-transparent"></div>
            </div>
          )}
        </Link>
        
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 relative group hover:scale-[1.02] border-2 border-red-500/50 hover:border-red-400 shadow-lg hover:shadow-xl font-bold ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Выйти' : ''}
          style={{ color: 'white' }}
        >
          <LogOut className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: 'white' }} />
          {!isCollapsed && (
            <span className="text-sm sm:text-base font-bold truncate" style={{ color: 'white' }}>Выйти</span>
          )}
          
          {/* Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-[100] shadow-xl border border-gray-700 pointer-events-none">
              Выйти
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-t-transparent border-r-4 border-r-gray-800 border-b-4 border-b-transparent"></div>
            </div>
          )}
        </button>
      </div>
      </div>
    </Fragment>
  );
}
