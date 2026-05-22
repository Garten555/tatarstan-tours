import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { GuideReportRow } from '@/components/admin/GuideReportsList';

function unwrapRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

function profileLabel(
  p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null,
  fallback: string
) {
  if (!p) return fallback;
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || p.email || fallback;
}

export async function GET() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = (profile as { role?: string } | null)?.role ?? 'user';
  if (!['super_admin', 'support_admin', 'tour_admin'].includes(role)) {
    return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
  }

  const { data: raw, error } = await serviceClient
    .from('guide_reports')
    .select(
      `
      id,
      room_id,
      reason,
      status,
      created_at,
      guide:profiles!guide_reports_guide_id_fkey(id, first_name, last_name, email, role, is_banned),
      reporter:profiles!guide_reports_reporter_id_fkey(id, first_name, last_name, email, role)
    `
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
  }

  const rows: GuideReportRow[] = (raw || []).map((r: Record<string, unknown>) => {
    const g = unwrapRelation(r.guide as object) as {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      role?: string | null;
      is_banned?: boolean | null;
    } | null;
    const rep = unwrapRelation(r.reporter as object) as {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      role?: string | null;
    } | null;

    return {
      id: String(r.id),
      room_id: r.room_id ? String(r.room_id) : null,
      created_at: String(r.created_at),
      reason: r.reason ? String(r.reason) : null,
      status: String(r.status ?? 'open'),
      guide_user_id: g?.id || '',
      guide_label: profileLabel(g, 'Гид'),
      guide_role: g?.role ?? null,
      guide_is_banned: Boolean(g?.is_banned),
      reporter_label: profileLabel(rep, 'Участник'),
      reporter_role: rep?.role ?? null,
    };
  });

  return NextResponse.json({ rows });
}
