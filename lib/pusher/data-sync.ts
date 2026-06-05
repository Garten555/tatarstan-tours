import Pusher from 'pusher';
import { revalidatePath } from 'next/cache';

const ADMIN_MODERATION_CHANNEL = 'admin-moderation';
const ADMIN_MODERATION_EVENT = 'reports-changed';
const USER_BOOKINGS_EVENT = 'bookings-changed';
export const PUBLIC_CATALOG_CHANNEL = 'public-catalog';
export const PUBLIC_CATALOG_EVENT = 'catalog-changed';

let pusherSingleton: Pusher | null | undefined;

function getPusher(): Pusher | null {
  if (pusherSingleton !== undefined) return pusherSingleton;
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.PUSHER_SECRET
  ) {
    pusherSingleton = null;
    return null;
  }
  pusherSingleton = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
    useTLS: true,
  });
  return pusherSingleton;
}

/** Обновить список «Мои бронирования» у пользователя. */
export async function publishBookingsChanged(userId: string): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(`user-${userId}`, USER_BOOKINGS_EVENT, { at: Date.now() });
  } catch (e) {
    console.error('[publishBookingsChanged]', e);
  }
}

/** Обновить админ-страницы жалоб (чаты туров, гиды). */
export async function publishAdminModerationChanged(): Promise<void> {
  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(ADMIN_MODERATION_CHANNEL, ADMIN_MODERATION_EVENT, { at: Date.now() });
  } catch (e) {
    console.error('[publishAdminModerationChanged]', e);
  }
}

/** Hero и каталог на главной: новые/завершённые туры, слоты, статусы. */
export async function publishCatalogChanged(): Promise<void> {
  try {
    revalidatePath('/');
    revalidatePath('/tours');
  } catch (e) {
    console.error('[publishCatalogChanged] revalidatePath:', e);
  }

  const pusher = getPusher();
  if (!pusher) return;
  try {
    await pusher.trigger(PUBLIC_CATALOG_CHANNEL, PUBLIC_CATALOG_EVENT, { at: Date.now() });
  } catch (e) {
    console.error('[publishCatalogChanged]', e);
  }
}

export { ADMIN_MODERATION_CHANNEL, ADMIN_MODERATION_EVENT, USER_BOOKINGS_EVENT };
