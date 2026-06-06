'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import FriendListCard, { type FriendListCardUser } from '@/components/friends/FriendListCard';

type Props = {
  friends: FriendListCardUser[];
  commonFriendIds: string[];
  showCommonTab?: boolean;
  currentUserId?: string | null;
};

export default function FriendsListClient({
  friends,
  commonFriendIds,
  showCommonTab = true,
  currentUserId = null,
}: Props) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'common'>('all');

  const visible = useMemo(() => {
    const base =
      tab === 'common' && showCommonTab
        ? friends.filter((f) => commonFriendIds.includes(f.id))
        : friends;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((f) => {
      const full = [f.first_name, f.last_name].filter(Boolean).join(' ').toLowerCase();
      const uname = (f.username || '').toLowerCase();
      return full.includes(q) || uname.includes(q);
    });
  }, [friends, tab, search, commonFriendIds, showCommonTab]);

  const onlineCount = useMemo(
    () =>
      friends.filter((f) => {
        if (!f.last_activity_at) return false;
        const diffMin = Math.floor((Date.now() - new Date(f.last_activity_at).getTime()) / 60000);
        return diffMin <= 5;
      }).length,
    [friends]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-gray-100 bg-white p-2 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all sm:text-base ${
              tab === 'all'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              Все друзья ({friends.length})
            </span>
          </button>
          {showCommonTab ? (
            <button
              type="button"
              onClick={() => setTab('common')}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all sm:text-base ${
                tab === 'common'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Общие друзья ({commonFriendIds.length})
            </button>
          ) : null}
        </div>
      </div>

      {onlineCount > 0 ? (
        <p className="text-sm font-semibold text-emerald-700 sm:text-base">
          ● {onlineCount} {onlineCount === 1 ? 'друг' : onlineCount < 5 ? 'друга' : 'друзей'} в сети
        </p>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по друзьям..."
          className="w-full rounded-xl border-2 border-gray-200 bg-white py-3 pl-12 pr-4 text-sm font-medium shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-base"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-10 text-center text-gray-600">
          Ничего не найдено
        </div>
      ) : (
        <div className="grid gap-4 md:gap-6">
          {visible.map((friend, index) => (
            <FriendListCard
              key={friend.id}
              user={friend}
              index={index}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
