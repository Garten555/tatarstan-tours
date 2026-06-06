'use client';

import { profileInitials } from '@/lib/guide-reports/status';

type Props = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  badge?: string | null;
  badgeClassName?: string;
  size?: 'sm' | 'md';
};

export default function ModerationUserChip({
  name,
  email,
  avatarUrl,
  badge,
  badgeClassName = 'bg-gray-100 text-gray-700',
  size = 'md',
}: Props) {
  const dim = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';
  const initials = profileInitials(name);

  return (
    <div className="flex min-w-0 items-center gap-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className={`${dim} shrink-0 rounded-xl border-2 border-white object-cover shadow-sm ring-1 ring-gray-200`}
        />
      ) : (
        <div
          className={`${dim} flex shrink-0 items-center justify-center rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-600 font-black text-white shadow-sm`}
        >
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-bold text-gray-900">{name}</span>
          {badge ? (
            <span
              className={`inline-block shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${badgeClassName}`}
            >
              {badge}
            </span>
          ) : null}
        </div>
        {email ? <p className="truncate text-xs font-semibold text-gray-500">{email}</p> : null}
      </div>
    </div>
  );
}
