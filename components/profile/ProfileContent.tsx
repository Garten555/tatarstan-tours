'use client';

import { useState } from 'react';
import { User, Mail, Phone, Calendar, Shield } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfileContentProps {
  profile: any;
  user: SupabaseUser;
}

export default function ProfileContent({ profile, user }: ProfileContentProps) {
  const [isEditing, setIsEditing] = useState(false);

  // ДЕБАГ: выводим что пришло
  console.log('ProfileContent - profile:', profile);
  console.log('ProfileContent - user.user_metadata:', user.user_metadata);

  // Получаем данные из profile или user_metadata (fallback)
  const firstName = profile?.first_name || user.user_metadata?.first_name || 'Имя';
  const lastName = profile?.last_name || user.user_metadata?.last_name || 'Фамилия';
  const middleName = profile?.middle_name || user.user_metadata?.middle_name || '';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;

  console.log('ProfileContent - firstName:', firstName);
  console.log('ProfileContent - lastName:', lastName);

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      user: 'Пользователь',
      tour_admin: 'Администратор туров',
      support_admin: 'Администратор поддержки',
      super_admin: 'Супер администратор',
    };
    return roles[role] || role;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900">Мой профиль</h1>
        <p className="mt-2 text-gray-600">
          Управляйте своим профилем и настройками аккаунта
        </p>
      </div>

      {/* Основная информация */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Личные данные
          </h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {isEditing ? 'Отмена' : 'Редактировать'}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Аватар */}
          <div className="md:col-span-2 flex items-center gap-6">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-emerald-100 hover:ring-emerald-200 transition-all cursor-pointer">
                {firstName[0]}{lastName[0]}
              </div>
            )}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {firstName} {middleName} {lastName}
              </h3>
              <p className="text-gray-600 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
            </div>
          </div>

          {/* Имя */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Имя
            </label>
            <input
              type="text"
              value={firstName}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Фамилия */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Фамилия
            </label>
            <input
              type="text"
              value={lastName}
              disabled={!isEditing}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Отчество */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              Отчество
            </label>
            <input
              type="text"
              value={middleName}
              disabled={!isEditing}
              placeholder="Не указано"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* Телефон */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4" />
              Телефон
            </label>
            <input
              type="tel"
              value={profile?.phone || ''}
              disabled={!isEditing}
              placeholder="+7 (900) 123-45-67"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          {/* Роль */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Shield className="w-4 h-4" />
              Роль
            </label>
            <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <span className="text-gray-700 font-medium">
                {getRoleName(profile?.role)}
              </span>
            </div>
          </div>

          {/* Дата регистрации */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Дата регистрации
            </label>
            <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <span className="text-gray-700">
                {new Date(profile?.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {/* Кнопка сохранения */}
        {isEditing && (
          <div className="mt-6 flex gap-3">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              Сохранить изменения
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-3xl font-bold text-emerald-600 mb-2">0</div>
          <div className="text-gray-600">Активных бронирований</div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-3xl font-bold text-emerald-600 mb-2">0</div>
          <div className="text-gray-600">Завершённых туров</div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-3xl font-bold text-emerald-600 mb-2">0 ₽</div>
          <div className="text-gray-600">Потрачено на туры</div>
        </div>
      </div>

      {/* Мои бронирования */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Мои бронирования
        </h2>
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">У вас пока нет бронирований</p>
          <p className="text-gray-500 mb-6">
            Выберите тур и забронируйте свое первое путешествие
          </p>
          <a
            href="/tours"
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Посмотреть туры
          </a>
        </div>
      </div>

      {/* Мои отзывы */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Мои отзывы
        </h2>
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">У вас пока нет отзывов</p>
          <p className="text-gray-500">
            Отзывы появятся после завершения туров
          </p>
        </div>
      </div>
    </div>
  );
}

