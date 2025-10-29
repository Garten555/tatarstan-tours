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
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      roles: ['super_admin', 'tour_admin', 'support_admin'],
    },
    {
      name: 'Tours',
      href: '/admin/tours',
      icon: Map,
      roles: ['super_admin', 'tour_admin'],
    },
    {
      name: 'Bookings',
      href: '/admin/bookings',
      icon: Calendar,
      roles: ['super_admin', 'tour_admin'],
    },
    {
      name: 'Reviews',
      href: '/admin/reviews',
      icon: Star,
      roles: ['super_admin', 'tour_admin', 'support_admin'],
    },
    {
      name: 'Chat Support',
      href: '/admin/chat',
      icon: MessageSquare,
      roles: ['super_admin', 'support_admin'],
    },
    {
      name: 'Users',
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

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
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
            <p className="text-xs text-gray-400 capitalize">
              {userRole.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Back to Site</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

