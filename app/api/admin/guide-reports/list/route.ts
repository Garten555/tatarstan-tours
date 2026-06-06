import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { GuideReportRow } from '@/components/admin/GuideReportsList';
import { GUIDE_REPORTS_DB_SELECT, mapGuideReportRow } from '@/lib/guide-reports/map-row';

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
    .select(GUIDE_REPORTS_DB_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
  }

  const rows: GuideReportRow[] = (raw || []).map((r) =>
    mapGuideReportRow(r as Record<string, unknown>)
  );

  return NextResponse.json({ rows });
}
