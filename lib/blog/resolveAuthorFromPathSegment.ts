/** Как на `/users/[username]`: UUID → по id, иначе строго по username (без id.eq.не-uuid в .or — PostgREST мог ломать запрос). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveAuthorIdFromPathSegment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client; узкий тип даёт «excessively deep» в TS
  serviceClient: any,
  rawSegment: string
): Promise<{ id: string } | null> {
  const trimmed = rawSegment.trim();
  const segment = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  const decoded = decodeURIComponent(segment);

  if (UUID_RE.test(decoded)) {
    const { data, error } = await serviceClient.from('profiles').select('id').eq('id', decoded).maybeSingle();
    if (error) return null;
    return data;
  }

  const { data, error } = await serviceClient.from('profiles').select('id').eq('username', decoded).maybeSingle();
  if (error) return null;
  return data;
}

export function pathSegmentLooksLikeUuid(rawSegment: string): boolean {
  const trimmed = rawSegment.trim();
  const segment = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return UUID_RE.test(decodeURIComponent(segment));
}
