import { profileDisplayName } from '@/lib/guide-reports/status';

export type ReviewAuthorProfile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

export function unwrapRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

export function mapReviewAuthor(
  embedded: ReviewAuthorProfile | ReviewAuthorProfile[] | null | undefined,
  fallbackProfile: ReviewAuthorProfile | null | undefined,
  userId: string
) {
  const p = unwrapRelation(embedded) ?? fallbackProfile ?? null;
  return {
    user_name: profileDisplayName(p, 'Пользователь'),
    user_email: p?.email ?? '',
    user_avatar_url: p?.avatar_url ?? null,
    user_id: p?.id ?? userId,
  };
}

export async function fetchProfilesByIds(
  serviceClient: { from: (table: string) => unknown },
  ids: string[]
): Promise<Map<string, ReviewAuthorProfile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, ReviewAuthorProfile>();
  if (unique.length === 0) return map;

  const client = serviceClient as {
    from: (table: string) => {
      select: (cols: string) => { in: (col: string, vals: string[]) => Promise<{ data: ReviewAuthorProfile[] | null }> };
    };
  };

  const { data } = await client.from('profiles').select('id, first_name, last_name, email, avatar_url').in('id', unique);
  for (const p of data ?? []) {
    map.set(p.id, p);
  }
  return map;
}
