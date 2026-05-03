import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { mergeLatestActivityTimestamps } from '@/lib/utils/presence';
import { Users } from 'lucide-react';
import FriendsListClient from './FriendsListClient';

type FriendUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  last_activity_at: string | null;
};

export default async function UserFriendsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, username, public_profile_enabled')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: isFriendship } =
    currentUser && currentUser.id !== profile.id
      ? await serviceClient
          .from('user_friends')
          .select('id')
          .or(
            `and(user_id.eq.${currentUser.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${currentUser.id})`
          )
          .eq('status', 'accepted')
          .maybeSingle()
      : { data: null as any };

  const canViewFriends =
    !!currentUser && (currentUser.id === profile.id || !!isFriendship);

  if (!canViewFriends) {
    return (
      <main className="min-h-screen bg-slate-100 pt-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-black text-gray-900 mb-2">Список друзей скрыт</h1>
            <p className="text-gray-600 mb-4">Доступен только владельцу профиля и его друзьям.</p>
            <Link
              href={`/users/${profile.username || profile.id}`}
              className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-white font-bold hover:bg-emerald-700"
            >
              Вернуться в профиль
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: friendships } = await serviceClient
    .from('user_friends')
    .select(
      `
      user_id,
      friend_id,
      friend:profiles!user_friends_friend_id_fkey(id, username, first_name, last_name, avatar_url),
      user:profiles!user_friends_user_id_fkey(id, username, first_name, last_name, avatar_url)
    `
    )
    .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const friends: FriendUser[] = (friendships || [])
    .map((row: any) => {
      const isUser1 = row.user_id === profile.id;
      return (isUser1 ? row.friend : row.user) as FriendUser;
    })
    .filter((f) => !!f?.id)
    .map((f) => ({ ...f, last_activity_at: null }));

  // Общие друзья (между текущим пользователем и владельцем страницы)
  let commonFriendIds: string[] = [];
  if (currentUser && currentUser.id !== profile.id) {
    const { data: myFriendships } = await serviceClient
      .from('user_friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    const myFriendSet = new Set<string>(
      (myFriendships || []).map((row: any) =>
        row.user_id === currentUser.id ? row.friend_id : row.user_id
      )
    );
    commonFriendIds = friends.filter((f) => myFriendSet.has(f.id)).map((f) => f.id);
  } else {
    commonFriendIds = friends.map((f) => f.id);
  }

  // Последняя активность (по сообщениям) для метки "в сети/был ... назад"
  const friendIds = friends.map((f) => f.id);
  const activityMap = new Map<string, string>();
  if (friendIds.length) {
    const [{ data: directMessages }, { data: roomMessages }] = await Promise.all([
      serviceClient
        .from('user_messages')
        .select('sender_id, created_at')
        .in('sender_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(800),
      serviceClient
        .from('tour_room_messages')
        .select('user_id, created_at')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(800),
    ]);

    for (const row of directMessages || []) {
      const id = (row as any).sender_id as string;
      if (!activityMap.has(id)) activityMap.set(id, (row as any).created_at as string);
    }
    for (const row of roomMessages || []) {
      const id = (row as any).user_id as string;
      const createdAt = (row as any).created_at as string;
      const existing = activityMap.get(id);
      if (!existing || new Date(createdAt).getTime() > new Date(existing).getTime()) {
        activityMap.set(id, createdAt);
      }
    }

    const { data: profilesSeen } = await serviceClient
      .from('profiles')
      .select('id, last_seen_at')
      .in('id', friendIds);

    for (const row of profilesSeen || []) {
      const id = (row as { id: string }).id;
      const ls = (row as { last_seen_at: string | null }).last_seen_at;
      const msgTs = activityMap.get(id) || null;
      const merged = mergeLatestActivityTimestamps(ls, msgTs);
      if (merged) activityMap.set(id, merged);
    }
  }

  const friendsWithActivity = friends.map((f) => ({
    ...f,
    last_activity_at: activityMap.get(f.id) || null,
  }));

  return (
    <main className="min-h-screen bg-slate-100 pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2.5">
            <Users className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Друзья @{profile.username}</h1>
            <p className="text-gray-600">{friends.length} пользователей</p>
          </div>
        </div>

        {friendsWithActivity.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            Пока нет друзей
          </div>
        ) : (
          <FriendsListClient
            username={profile.username}
            friends={friendsWithActivity}
            commonFriendIds={commonFriendIds}
          />
        )}
      </div>
    </main>
  );
}

