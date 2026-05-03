import type { SupabaseClient, User } from '@supabase/supabase-js';

const NETWORK_AUTH_FALLBACK_MS = 6000;

/**
 * Текущий пользователь из локальной сессии (storage/cookies в браузере).
 * Не вызывает верификацию JWT на сервере Supabase Auth — не «зависает» при блокировке сети без VPN.
 */
export async function getUserFromSession(client: SupabaseClient): Promise<User | null> {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();
  if (error || !session?.user) return null;
  return session.user;
}

/**
 * Для UI: сначала локальная сессия; если её нет — короткий запрос getUser() (refresh и т.д.) с таймаутом,
 * чтобы не было бесконечного «Проверка входа…», когда Auth API недоступен.
 */
export async function resolveAuthUserForUi(client: SupabaseClient): Promise<User | null> {
  const local = await getUserFromSession(client);
  if (local) return local;

  const result = await Promise.race([
    client.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), NETWORK_AUTH_FALLBACK_MS),
    ),
  ]);
  return result.data.user ?? null;
}
