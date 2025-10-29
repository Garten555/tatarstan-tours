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
  Home
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AdminSidebarProps {
  userRole: string;
  userName: string;
}

export default function AdminSidebar({ userRole, userName }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Админ панель</h1>
        <p className="text-sm text-gray-400 mt-1">Tatarstan Tours</p>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-sm font-bold">
            {userName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-gray-400">
              {getRoleLabel(userRole)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm font-medium">На главную</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Выйти</span>
        </button>
      </div>
    </div>
  );
}
