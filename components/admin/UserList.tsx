'use client';

import { useMemo, useState } from 'react';
import { Shield, Mail, Calendar, Check, X, Search, User as UserIcon, ExternalLink, BookOpen, Ban } from 'lucide-react';
import Link from 'next/link';
import BanUserButton from './BanUserButton';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  avatar_url?: string | null;
  username?: string | null;
  is_banned?: boolean | null;
  ban_reason?: string | null;
  banned_at?: string | null;
  ban_until?: string | null;
}

interface UserListProps {
  users: User[];
  currentUserId: string;
  currentUserRole?: string;
}

export default function UserList({ users, currentUserId, currentUserRole = 'user' }: UserListProps) {
  const canChangeRoles = currentUserRole === 'super_admin';
  const canBanUsers = currentUserRole === 'super_admin' || currentUserRole === 'support_admin';
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Обработчик изменения роли
  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoadingUserId(userId);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось обновить роль');
      }

      setMessage({ type: 'success', text: 'Роль успешно обновлена!' });
      
      // Перезагружаем страницу через 1 секунду
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoadingUserId(null);
    }
  };

  // Роли
  const roles = [
    { value: 'user', label: 'Пользователь', color: 'bg-gray-100 text-gray-800' },
    { value: 'guide', label: 'Гид', color: 'bg-green-100 text-green-800' },
    { value: 'tour_admin', label: 'Админ туров', color: 'bg-blue-100 text-blue-800' },
    { value: 'support_admin', label: 'Модератор', color: 'bg-purple-100 text-purple-800' },
    { value: 'super_admin', label: 'Супер Админ', color: 'bg-red-100 text-red-800' },
  ];

  const getRoleColor = (role: string) => {
    return roles.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    return roles.find(r => r.value === role)?.label || role;
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
      const email = (user.email || '').toLowerCase();
      const matchesQuery =
        !query || fullName.includes(query) || email.includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const getInitials = (user: User) => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    if (first || last) {
      return `${first}${last}`.toUpperCase();
    }
    return (user.email?.[0] || '?').toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm -mx-4 md:-mx-6 lg:-mx-8 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]">
      {/* Фильтры */}
      <div className="p-6 border-b-2 border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или email"
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
            >
              <option value="all">Все роли</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
            <span className="text-base font-bold text-gray-700">Найдено:</span>
            <span className="text-2xl font-black text-emerald-700">{filteredUsers.length}</span>
          </div>
        </div>
      </div>
      {/* Сообщение */}
      {message && (
        <div className={`p-5 border-b-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'success' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
            <span className="text-base font-bold">{message.text}</span>
          </div>
        </div>
      )}

      {/* Таблица пользователей */}
      <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Пользователь
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Текущая роль
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Зарегистрирован
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <UserIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl font-black text-gray-900">Пользователи не найдены</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                const isLoading = loadingUserId === user.id;
                // Используем ID для просмотра профиля через /profile?id=...
                // Профиль - страница /profile с параметром id для админов
                const profileLink = `/profile?id=${user.id}`;
                // Туристический паспорт - используем username или id (без якоря, чтобы не было автоматической прокрутки)
                const passportLink = `/users/${user.username || user.id}`;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-black text-lg overflow-hidden border-2 border-emerald-200">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Пользователь'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(user)
                          )}
                        </div>
                        <div>
                          <div className="text-base font-black text-gray-900">
                            {`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Без имени'}
                            {isCurrentUser && (
                              <span className="ml-2 text-sm text-emerald-600 font-bold">(Вы)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-base text-gray-700">
                        <Mail className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-sm leading-5 font-bold rounded-lg ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-base text-gray-700">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold">{new Date(user.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={profileLink}
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-emerald-200 rounded-xl text-base font-bold text-emerald-700 hover:bg-emerald-50 transition-all duration-200"
                          title="Открыть профиль"
                        >
                          <UserIcon className="w-5 h-5" />
                          Профиль
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link
                          href={passportLink}
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-yellow-200 rounded-xl text-base font-bold text-yellow-700 hover:bg-yellow-50 transition-all duration-200"
                          title="Открыть туристический паспорт"
                        >
                          <BookOpen className="w-5 h-5" />
                          Туристический паспорт
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        {canBanUsers && !isCurrentUser && (
                          <div className="inline-block">
                            <BanUserButton
                              userId={user.id}
                              isBanned={user.is_banned || false}
                              banReason={user.ban_reason}
                              bannedAt={user.banned_at}
                              banUntil={user.ban_until}
                              userRole={user.role}
                              onBanChange={() => {
                                // Немедленная перезагрузка для обновления роли
                                window.location.reload();
                              }}
                            />
                          </div>
                        )}
                        {isCurrentUser ? (
                          <span className="text-base text-gray-400 font-semibold">Нельзя изменить свою роль</span>
                        ) : canChangeRoles ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              disabled={isLoading}
                              className="border-2 border-gray-200 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                            >
                              {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                            {isLoading && (
                              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            )}
                          </div>
                        ) : (
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-5 bg-gray-50 border-t-2 border-gray-200">
        <p className="text-base font-bold text-gray-700">
          Всего пользователей: <span className="text-xl font-black text-emerald-700">{users.length}</span>
        </p>
      </div>
    </div>
  );
}
