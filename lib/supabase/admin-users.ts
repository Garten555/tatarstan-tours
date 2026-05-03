import type { SupabaseClient, User } from '@supabase/supabase-js';

const PER_PAGE = 1000;
const MAX_PAGES = 500;

/** Поиск пользователя по email через Admin API с пагинацией (listUsers по умолчанию отдаёт только одну страницу). */
export async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ user?: User; error?: string }> {
  const norm = email.trim().toLowerCase();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) {
      return { error: error.message };
    }
    const users = data?.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === norm);
    if (found) {
      return { user: found };
    }
    if (users.length < PER_PAGE) {
      return {};
    }
  }

  return { error: 'Превышен лимит перебора страниц пользователей' };
}
