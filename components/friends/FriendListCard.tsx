'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Star } from 'lucide-react';
import { formatLastSeen } from '@/lib/utils/presence';

export type FriendListCardUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  reputation_score?: number | null;
  status_level?: number | null;
  last_activity_at?: string | null;
};

function getUserName(user: FriendListCardUser) {
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return full || user.username || 'Пользователь';
}

function getInitials(user: FriendListCardUser) {
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  }
  return getUserName(user).slice(0, 2).toUpperCase();
}

type Props = {
  user: FriendListCardUser;
  index?: number;
  showMessage?: boolean;
  currentUserId?: string | null;
};

export default function FriendListCard({
  user,
  index = 0,
  showMessage = true,
  currentUserId = null,
}: Props) {
  const seen = formatLastSeen(user.last_activity_at);
  const isSelf = currentUserId != null && user.id === currentUserId;
  const canMessage = showMessage && !isSelf;

  return (
    <div
      className="group rounded-2xl border-2 border-gray-100 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl sm:p-6 md:p-8"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center md:gap-6">
        <Link href={`/users/${user.username || user.id}`} className="relative shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={getUserName(user)}
              width={80}
              height={80}
              className="h-16 w-16 rounded-2xl border-2 border-blue-100 object-cover transition-colors group-hover:border-blue-300 sm:h-20 sm:w-20"
              unoptimized={user.avatar_url.includes('s3.twcstorage.ru')}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-400 to-blue-600 text-xl font-black text-white transition-colors group-hover:border-blue-300 sm:h-20 sm:w-20 sm:text-2xl">
              {getInitials(user)}
            </div>
          )}
          {seen.online ? (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500"
              title="в сети"
            />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/users/${user.username || user.id}`}>
            <h3 className="mb-1 text-lg font-black text-gray-900 transition-colors hover:text-blue-600 sm:text-xl md:text-2xl">
              {getUserName(user)}
            </h3>
          </Link>

          {user.username ? (
            <p className="mb-2 text-sm font-medium text-gray-500 sm:text-base md:text-lg">
              @{user.username}
            </p>
          ) : null}

          <p className={`mb-2 text-sm font-semibold sm:mb-3 ${seen.online ? 'text-emerald-600' : 'text-gray-400'}`}>
            {seen.online ? '● ' : ''}
            {seen.label}
          </p>

          {user.bio ? (
            <p className="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-600 sm:text-base md:text-lg">
              {user.bio}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base md:text-lg">
            <div className="flex items-center gap-2 font-bold text-blue-600">
              <Star className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              <span>{user.reputation_score || 0} опыта</span>
            </div>
            {(user.status_level ?? 0) > 0 ? (
              <div className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 sm:text-sm">
                Уровень {user.status_level}
              </div>
            ) : null}
          </div>
        </div>

        {canMessage ? (
          <div className="w-full sm:w-auto">
            <Link
              href={`/messenger?user=${user.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 transition-all hover:scale-[1.02] hover:bg-gray-200 hover:shadow-lg sm:w-auto sm:text-base"
            >
              <MessageCircle className="h-5 w-5" />
              Написать
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
