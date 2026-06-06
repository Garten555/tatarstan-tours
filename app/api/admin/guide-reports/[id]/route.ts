import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isGuideReportStatus } from '@/lib/guide-reports/status';
import { publishAdminModerationChanged } from '@/lib/pusher/data-sync';

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role ?? 'user';
  if (!['super_admin', 'support_admin', 'tour_admin'].includes(role)) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }
  return { ok: true as const, userId: user.id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body?.status === 'string' ? body.status.trim() : '';

    if (!isGuideReportStatus(status)) {
      return NextResponse.json(
        { error: 'Недопустимый статус. Допустимо: open, reviewed, resolved, dismissed' },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();
    const { data, error } = await serviceClient
      .from('guide_reports')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .maybeSingle();

    if (error) {
      console.error('[guide-reports PATCH]', error);
      if (error.message?.includes('guide_reports_status_check')) {
        return NextResponse.json(
          {
            error:
              'Статус resolved не разрешён в БД. Выполните database/migrations/009_guide_reports_resolved_status.sql в Supabase.',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Жалоба не найдена' }, { status: 404 });
    }

    void publishAdminModerationChanged();

    return NextResponse.json({ success: true, id: data.id, status: data.status });
  } catch (e) {
    console.error('[guide-reports PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
