import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { mergeLatestActivityTimestamps } from '@/lib/utils/presence';
import FriendsPageLayout from '@/components/friends/FriendsPageLayout';
import FriendsListClient from './FriendsListClient';

type FriendUser = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  reputation_score: number | null;
  status_level: number | null;
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

  if (currentUser?.id === profile.id) {
    redirect('/friends');
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
      : { data: null as { id: string } | null };

  const canViewFriends = !!currentUser && (currentUser.id === profile.id || !!isFriendship);

  if (!canViewFriends) {
    return (
      <FriendsPageLayout
        title="Список друзей скрыт"
        subtitle="Доступен только владельцу профиля и его друзьям"
        backHref={`/users/${profile.username || profile.id}`}
        backLabel="Вернуться в профиль"
      >
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-8 text-center">
          <Link
            href={`/users/${profile.username || profile.id}`}
            className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-700"
          >
            Вернуться в профиль
          </Link>
        </div>
      </FriendsPageLayout>
    );
  }

  const { data: friendships } = await serviceClient
    .from('user_friends')
    .select(
      `
      user_id,
      friend_id,
      friend:profiles!user_friends_friend_id_fkey(
        id, username, first_name, last_name, avatar_url, bio, reputation_score, status_level
      ),
      user:profiles!user_friends_user_id_fkey(
        id, username, first_name, last_name, avatar_url, bio, reputation_score, status_level
      )
    `
    )
    .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const friends: FriendUser[] = (friendships || [])
    .map((row: Record<string, unknown>) => {
      const isUser1 = row.user_id === profile.id;
      const rel = isUser1 ? row.friend : row.user;
      const f = Array.isArray(rel) ? rel[0] : rel;
      return f as FriendUser | null;
    })
    .filter((f): f is FriendUser => !!f?.id)
    .map((f) => ({ ...f, last_activity_at: null }));

  let commonFriendIds: string[] = [];
  if (currentUser && currentUser.id !== profile.id) {
    const { data: myFriendships } = await serviceClient
      .from('user_friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
      .eq('status', 'accepted');
    const myFriendSet = new Set<string>(
      (myFriendships || []).map((row: { user_id: string; friend_id: string }) =>
        row.user_id === currentUser.id ? row.friend_id : row.user_id
      )
    );
    commonFriendIds = friends.filter((f) => myFriendSet.has(f.id)).map((f) => f.id);
  } else {
    commonFriendIds = friends.map((f) => f.id);
  }

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
      const id = (row as { sender_id: string }).sender_id;
      if (!activityMap.has(id)) activityMap.set(id, (row as { created_at: string }).created_at);
    }
    for (const row of roomMessages || []) {
      const id = (row as { user_id: string }).user_id;
      const createdAt = (row as { created_at: string }).created_at;
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

  const countLabel =
    friends.length === 1
      ? '1 друг'
      : friends.length >= 2 && friends.length <= 4
        ? `${friends.length} друга`
        : `${friends.length} друзей`;

  return (
    <FriendsPageLayout
      title={`Друзья @${profile.username}`}
      subtitle={`${countLabel}${commonFriendIds.length && currentUser ? ` · ${commonFriendIds.length} общих с вами` : ''}`}
      backHref={`/users/${profile.username || profile.id}`}
      backLabel="Вернуться в профиль"
    >
      {friendsWithActivity.length === 0 ? (
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-10 text-center text-gray-600">
          Пока нет друзей
        </div>
      ) : (
        <FriendsListClient
          friends={friendsWithActivity}
          commonFriendIds={commonFriendIds}
          showCommonTab={Boolean(currentUser && currentUser.id !== profile.id)}
        />
      )}
    </FriendsPageLayout>
  );
}
