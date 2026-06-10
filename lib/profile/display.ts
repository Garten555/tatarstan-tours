export function unwrapRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

export type ProfileSnippet = {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

export function profileDisplayName(
  p: ProfileSnippet | null | undefined,
  fallback = 'Пользователь'
): string {
  if (!p) return fallback;
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return name || p.username || p.email || fallback;
}

export function profileInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export function normalizeProfileSnippet(
  raw: unknown,
  userId: string
): ProfileSnippet {
  const p = unwrapRelation(raw as ProfileSnippet | ProfileSnippet[] | null);
  if (!p) return { id: userId, username: null };
  return {
    id: p.id || userId,
    username: p.username ?? null,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    email: p.email ?? null,
    avatar_url: p.avatar_url ?? null,
    role: p.role ?? null,
  };
}
