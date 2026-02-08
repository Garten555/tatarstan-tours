'use client';

import Link from 'next/link';
import { Users, Map, Calendar, Star, CheckCircle, Clock } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalUsers: number;
    totalTours: number;
    totalBookings: number;
    totalReviews: number;
    activeBookings: number;
    pendingReviews: number;
  };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      name: 'Всего пользователей',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/users',
    },
    {
      name: 'Всего туров',
      value: stats.totalTours,
      icon: Map,
      color: 'bg-emerald-500',
      href: '/admin/tours',
    },
    {
      name: 'Всего бронирований',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'bg-purple-500',
      href: '/admin/bookings',
    },
    {
      name: 'Всего отзывов',
      value: stats.totalReviews,
      icon: Star,
      color: 'bg-yellow-500',
      href: '/admin/reviews',
    },
    {
      name: 'Активные бронирования',
      value: stats.activeBookings,
      icon: CheckCircle,
      color: 'bg-green-500',
      href: '/admin/bookings?status=confirmed',
    },
    {
      name: 'Отзывы на модерации',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'bg-orange-500',
      href: '/admin/reviews?status=pending',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;

        const content = (
          <div className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3 truncate">{stat.name}</p>
                <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-1">
                  {stat.value.toLocaleString('ru-RU')}
                </p>
              </div>
              <div className={`${stat.color} p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-white" />
              </div>
            </div>
            {/* Декоративный градиент */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-200 to-transparent opacity-50" />
          </div>
        );

        return stat.href ? (
          <Link
            key={stat.name}
            href={stat.href}
            className="group bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-sm p-4 sm:p-6 md:p-8 hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 block cursor-pointer transform hover:-translate-y-0.5 sm:hover:-translate-y-1"
          >
            {content}
          </Link>
        ) : (
          <div
            key={stat.name}
            className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-sm p-4 sm:p-6 md:p-8 hover:shadow-xl transition-all duration-300"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

