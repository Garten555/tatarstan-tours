import type { SupabaseClient } from '@supabase/supabase-js';

/** ID пользователей с принятой дружбой относительно profileUserId. */
export async function getAcceptedFriendIds(
  serviceClient: SupabaseClient,
  profileUserId: string
): Promise<Set<string>> {
  const { data } = await serviceClient
    .from('user_friends')
    .select('user_id, friend_id')
    .or(`user_id.eq.${profileUserId},friend_id.eq.${profileUserId}`)
    .eq('status', 'accepted');

  const ids = new Set<string>();
  for (const row of data || []) {
    ids.add(row.user_id === profileUserId ? row.friend_id : row.user_id);
  }
  return ids;
}

/** Подписчик = есть запись в user_follows и нет принятой дружбы (после принятия заявки — только друзья). */
export async function getSubscriberFollows(
  serviceClient: SupabaseClient,
  profileUserId: string,
  limit?: number
) {
  const friendIds = await getAcceptedFriendIds(serviceClient, profileUserId);

  let query = serviceClient
    .from('user_follows')
    .select(`
      follower_id,
      created_at,
      follower:profiles!user_follows_follower_id_fkey(
        id,
        username,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq('followed_id', profileUserId)
    .order('created_at', { ascending: false });

  if (limit != null) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    return { rows: [], count: 0, error };
  }

  const rows = (data || []).filter((row) => !friendIds.has(row.follower_id));
  return { rows, count: rows.length, error: null };
}

/** После принятия заявки: заявитель становится подписчиком (для ленты и галереи). */
export async function addSubscriberFollow(
  serviceClient: SupabaseClient,
  followerId: string,
  followedId: string
) {
  const { error } = await serviceClient.from('user_follows').insert({
    follower_id: followerId,
    followed_id: followedId,
  });
  if (error && error.code !== '23505') {
    return error;
  }
  return null;
}

/** Удалить подписку между пользователями (в обе стороны). */
export async function removeFollowBetween(
  serviceClient: SupabaseClient,
  userA: string,
  userB: string
) {
  await serviceClient
    .from('user_follows')
    .delete()
    .or(
      `and(follower_id.eq.${userA},followed_id.eq.${userB}),and(follower_id.eq.${userB},followed_id.eq.${userA})`
    );
}

/** Доступ к закрытому профилю: владелец, админ, друг или подписчик (после принятия заявки). */
export async function canViewPrivateProfile(
  serviceClient: SupabaseClient,
  profileUserId: string,
  viewerId: string | null,
  isAdmin: boolean
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === profileUserId || isAdmin) return true;

  const user1 = viewerId < profileUserId ? viewerId : profileUserId;
  const user2 = viewerId < profileUserId ? profileUserId : viewerId;

  const [{ data: friendship }, { data: follow }] = await Promise.all([
    serviceClient
      .from('user_friends')
      .select('status')
      .or(`and(user_id.eq.${user1},friend_id.eq.${user2}),and(user_id.eq.${user2},friend_id.eq.${user1})`)
      .eq('status', 'accepted')
      .maybeSingle(),
    serviceClient
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('followed_id', profileUserId)
      .maybeSingle(),
  ]);

  return !!friendship || !!follow;
}

/** Проверка доступа к галереи: подписчик или друг. */
export async function hasGalleryFollowerAccess(
  serviceClient: SupabaseClient,
  profileUserId: string,
  viewerId: string
): Promise<boolean> {
  const user1 = viewerId < profileUserId ? viewerId : profileUserId;
  const user2 = viewerId < profileUserId ? profileUserId : viewerId;

  const [{ data: friendship }, { data: follow }] = await Promise.all([
    serviceClient
      .from('user_friends')
      .select('status')
      .or(`and(user_id.eq.${user1},friend_id.eq.${user2}),and(user_id.eq.${user2},friend_id.eq.${user1})`)
      .eq('status', 'accepted')
      .maybeSingle(),
    serviceClient
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('followed_id', profileUserId)
      .maybeSingle(),
  ]);

  return !!friendship || !!follow;
}
