import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import { shiftTourSession } from '@/lib/tour/shift-tour-session';

/**
 * PATCH /api/admin/team-schedule/session
 * Быстрый сдвиг времени одного выезда из расписания.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireTourManager(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const body = await request.json();
    const sessionId = typeof body?.session_id === 'string' ? body.session_id : '';
    const start_at = typeof body?.start_at === 'string' ? body.start_at : '';
    const end_at =
      body?.end_at === null || body?.end_at === ''
        ? null
        : typeof body?.end_at === 'string'
          ? body.end_at
          : undefined;

    if (!sessionId || !start_at) {
      return NextResponse.json(
        { error: 'Нужны session_id и start_at' },
        { status: 400 }
      );
    }

    const result = await shiftTourSession(serviceClient, {
      sessionId,
      start_at,
      end_at: end_at ?? null,
      actor: auth.user,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('PATCH /api/admin/team-schedule/session', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
