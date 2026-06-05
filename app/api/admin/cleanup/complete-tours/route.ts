// Автозавершение туров с прошедшими датами — для cron (CRON_SECRET) или ручного запуска админом
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { completeFinishedActiveTours } from '@/lib/tours/tour-lifecycle-status';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized =
      !!cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = (profile as { role?: string } | null)?.role;
      if (!role || !['super_admin', 'tour_admin', 'support_admin'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const serviceClient = createServiceClient();
    const result = await completeFinishedActiveTours(serviceClient);

    return NextResponse.json({
      success: true,
      completed_count: result.completed_count,
      tour_ids: result.tour_ids,
      message:
        result.completed_count > 0
          ? `Завершено туров: ${result.completed_count}`
          : 'Нет туров для автозавершения',
    });
  } catch (error) {
    console.error('complete-tours cleanup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
