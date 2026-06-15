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

export type GalleryVisibility = 'everyone' | 'followers' | 'friends' | 'nobody';

/** Единая проверка доступа к галерее (страница /gallery и превью на профиле). */
export async function canViewUserGallery(
  serviceClient: SupabaseClient,
  profileUserId: string,
  viewerId: string | null,
  isAdmin: boolean,
  whoCanViewGallery: GalleryVisibility = 'everyone'
): Promise<boolean> {
  if (whoCanViewGallery === 'everyone') return true;
  if (viewerId === profileUserId || isAdmin) return true;
  if (!viewerId) return false;
  if (whoCanViewGallery === 'nobody') return false;

  if (whoCanViewGallery === 'friends') {
    const user1 = viewerId < profileUserId ? viewerId : profileUserId;
    const user2 = viewerId < profileUserId ? profileUserId : viewerId;
    const { data: friendship } = await serviceClient
      .from('user_friends')
      .select('status')
      .or(`and(user_id.eq.${user1},friend_id.eq.${user2}),and(user_id.eq.${user2},friend_id.eq.${user1})`)
      .eq('status', 'accepted')
      .maybeSingle();
    return !!friendship;
  }

  if (whoCanViewGallery === 'followers') {
    return hasGalleryFollowerAccess(serviceClient, profileUserId, viewerId);
  }

  return false;
}

export function galleryAccessHint(
  whoCanViewGallery: GalleryVisibility,
  isLoggedIn: boolean
): string {
  if (whoCanViewGallery === 'nobody') {
    return 'Автор скрыл галерею. Она доступна только ему.';
  }
  if (whoCanViewGallery === 'friends') {
    return isLoggedIn
      ? 'Галерея доступна только друзьям автора. Подайте заявку в друзья, чтобы увидеть фото.'
      : 'Войдите в аккаунт и станьте другом автора, чтобы просмотреть галерею.';
  }
  if (whoCanViewGallery === 'followers') {
    return isLoggedIn
      ? 'Галерея доступна подписчикам и друзьям. Подайте заявку в друзья — после принятия откроется доступ.'
      : 'Войдите в аккаунт и подайте заявку в друзья, чтобы просмотреть галерею.';
  }
  return '';
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
