'use client';

import Image from 'next/image';
import { Shield } from 'lucide-react';

const ADMIN_ROLES = new Set(['super_admin', 'tour_admin', 'support_admin']);

const SIZE = {
  sm: { box: 'w-10 h-10', text: 'text-sm', badge: 'w-5 h-5 -top-0.5 -right-0.5', icon: 'w-2.5 h-2.5' },
  md: { box: 'w-12 h-12', text: 'text-base', badge: 'w-6 h-6 -top-1 -right-1', icon: 'w-3 h-3' },
  lg: { box: 'w-14 h-14', text: 'text-lg', badge: 'w-7 h-7 -top-1 -right-1', icon: 'w-3.5 h-3.5' },
} as const;

function initialLetter(displayName?: string, username?: string | null): string {
  const s = (displayName || username || 'U').trim();
  return (s[0] || 'U').toUpperCase();
}

export type UserAvatarProps = {
  avatarUrl?: string | null;
  displayName?: string;
  username?: string | null;
  role?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  /** Показывать фиолетовый щит для админ-ролей (по умолчанию true) */
  showAdminBadge?: boolean;
};

export default function UserAvatar({
  avatarUrl,
  displayName,
  username,
  role,
  size = 'md',
  className = '',
  showAdminBadge = true,
}: UserAvatarProps) {
  const s = SIZE[size];
  const isAdmin = Boolean(role && ADMIN_ROLES.has(role));

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${s.box} overflow-hidden rounded-full border-2 border-emerald-200/80 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-black flex items-center justify-center ${s.text}`}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName || username || 'Пользователь'}
            width={56}
            height={56}
            className="h-full w-full object-cover"
            unoptimized={avatarUrl.includes('s3.twcstorage.ru')}
          />
        ) : (
          initialLetter(displayName, username)
        )}
      </div>
      {showAdminBadge && isAdmin ? (
        <span
          className={`absolute flex items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md ${s.badge}`}
          title="Администратор"
        >
          <Shield className={s.icon} aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
