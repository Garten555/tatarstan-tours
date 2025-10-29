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
  ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface AdminSidebarProps {
  userRole: string;
  userName: string;
}

export default function AdminSidebar({ userRole, userName }: AdminSidebarProps) {
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
      href: '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'tour_admin', 'support_admin'],
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
      roles: ['super_admin'],
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
      'support_admin': 'Админ поддержки',
      'user': 'Пользователь',
    };
    return roles[role] || role;
  };

  return (
    <div 
      className={`bg-gray-900 text-white flex flex-col transition-all duration-300 relative ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      {!isCollapsed && (
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">Админ панель</h1>
          <p className="text-sm text-gray-400 mt-1">Туры по Татарстану</p>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-6 -right-3 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white hover:bg-emerald-700 transition-colors shadow-lg z-10"
        title={isCollapsed ? 'Развернуть' : 'Свернуть'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* User info */}
      <div className={`p-4 border-b border-gray-800 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {userName.split(' ').map(n => n[0]).join('')}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">
                {getRoleLabel(userRole)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-4 space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
              
              {/* Tooltip при свёрнутом сайдбаре */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={`p-4 border-t border-gray-800 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors relative group ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'На главную' : ''}
        >
          <Home className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium">На главную</span>
          )}
          
          {/* Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              На главную
            </div>
          )}
        </Link>
        
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors relative group ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Выйти' : ''}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-sm font-medium">Выйти</span>
          )}
          
          {/* Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              Выйти
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
