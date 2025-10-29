'use client';

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
      name: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Tours',
      value: stats.totalTours,
      icon: Map,
      color: 'bg-emerald-500',
    },
    {
      name: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'bg-purple-500',
    },
    {
      name: 'Total Reviews',
      value: stats.totalReviews,
      icon: Star,
      color: 'bg-yellow-500',
    },
    {
      name: 'Active Bookings',
      value: stats.activeBookings,
      icon: CheckCircle,
      color: 'bg-green-500',
    },
    {
      name: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

