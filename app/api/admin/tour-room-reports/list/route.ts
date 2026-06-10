import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { fetchTourRoomMessageReports } from '@/lib/tour-room-reports/fetch-reports';

export async function GET() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

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

  const result = await fetchTourRoomMessageReports(serviceClient);

  if (result.error) {
    return NextResponse.json(
      { error: result.error, rows: [], setupHint: result.setupHint },
      { status: result.setupHint ? 503 : 500 }
    );
  }

  return NextResponse.json({
    rows: result.rows,
    setupHint: result.setupHint,
  });
}
