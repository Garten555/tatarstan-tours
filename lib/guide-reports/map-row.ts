import type { GuideReportRow } from '@/components/admin/GuideReportsList';
import { profileDisplayName } from '@/lib/guide-reports/status';

export function unwrapRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

type ProfileSlice = {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  is_banned?: boolean | null;
};

export function mapGuideReportRow(r: Record<string, unknown>): GuideReportRow {
  const g = unwrapRelation(r.guide as object) as ProfileSlice | null;
  const rep = unwrapRelation(r.reporter as object) as ProfileSlice | null;

  return {
    id: String(r.id),
    room_id: r.room_id ? String(r.room_id) : null,
    created_at: String(r.created_at),
    reason: r.reason ? String(r.reason) : null,
    status: String(r.status ?? 'open'),
    guide_user_id: g?.id || '',
    guide_label: profileDisplayName(g, 'Гид'),
    guide_email: g?.email ?? null,
    guide_avatar_url: g?.avatar_url ?? null,
    guide_role: g?.role ?? null,
    guide_is_banned: Boolean(g?.is_banned),
    reporter_user_id: rep?.id ?? null,
    reporter_label: profileDisplayName(rep, 'Участник'),
    reporter_email: rep?.email ?? null,
    reporter_avatar_url: rep?.avatar_url ?? null,
    reporter_role: rep?.role ?? null,
  };
}

export const GUIDE_REPORTS_DB_SELECT = `
  id,
  room_id,
  reason,
  status,
  created_at,
  guide:profiles!guide_reports_guide_id_fkey(
    id,
    first_name,
    last_name,
    email,
    role,
    avatar_url,
    is_banned
  ),
  reporter:profiles!guide_reports_reporter_id_fkey(
    id,
    first_name,
    last_name,
    email,
    role,
    avatar_url
  )
`;
