'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatLastSeen } from '@/lib/utils/presence';

type FriendUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  last_activity_at: string | null;
};

type Props = {
  username: string | null;
  friends: FriendUser[];
  commonFriendIds: string[];
};

export default function FriendsListClient({ username, friends, commonFriendIds }: Props) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'common'>('all');

  const visible = useMemo(() => {
    const base = tab === 'common' ? friends.filter((f) => commonFriendIds.includes(f.id)) : friends;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((f) => {
      const full = [f.first_name, f.last_name].filter(Boolean).join(' ').toLowerCase();
      const uname = (f.username || '').toLowerCase();
      return full.includes(q) || uname.includes(q);
    });
  }, [friends, tab, search, commonFriendIds]);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setTab('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
            tab === 'all'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          Все друзья ({friends.length})
        </button>
        <button
          onClick={() => setTab('common')}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
            tab === 'common'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          Общие друзья ({commonFriendIds.length})
        </button>
      </div>

      <div className="mb-5 relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по друзьям..."
          className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          Ничего не найдено
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((friend) => {
            const fullName = [friend.first_name, friend.last_name].filter(Boolean).join(' ').trim();
            const seen = formatLastSeen(friend.last_activity_at);
            return (
              <Link
                key={friend.id}
                href={`/users/${friend.username || friend.id}`}
                className="rounded-2xl border border-gray-200 bg-white p-4 hover:border-emerald-300 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.username || 'user'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      {(friend.username || 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">
                      {fullName || friend.username || 'Пользователь'}
                    </div>
                    <div className="text-sm text-gray-500 truncate">@{friend.username || friend.id}</div>
                    <div className={`text-xs mt-1 font-semibold ${seen.online ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {seen.online ? '● ' : ''}
                      {seen.label}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

