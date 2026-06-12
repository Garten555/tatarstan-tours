import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import { computeAutoShiftForSession } from '@/lib/tour/compute-auto-shift';
import { shiftTourSession } from '@/lib/tour/shift-tour-session';

async function handleSessionShift(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const auth = await requireTourManager(supabase);
  if (!auth) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  const body = await request.json();
  const sessionId = typeof body?.session_id === 'string' ? body.session_id : '';
  const autoShift = body?.auto_shift === true;
  const suggestOnly = body?.suggest_only === true;

  if (!sessionId) {
    return NextResponse.json({ error: 'Нужен session_id' }, { status: 400 });
  }

  if (autoShift || suggestOnly) {
    const suggested = await computeAutoShiftForSession(serviceClient, sessionId);
    if (!suggested) {
      return NextResponse.json(
        {
          error:
            'Не удалось подобрать свободный слот для гида в ближайшие две недели. Назначьте другого гида или сдвиньте вручную.',
        },
        { status: 400 }
      );
    }

    if (suggestOnly) {
      return NextResponse.json({ success: true, suggested });
    }

    const result = await shiftTourSession(serviceClient, {
      sessionId,
      start_at: suggested.start_at,
      end_at: suggested.end_at,
      actor: auth.user,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }

    return NextResponse.json({ success: true, applied: suggested });
  }

  const start_at = typeof body?.start_at === 'string' ? body.start_at : '';
  const end_at =
    body?.end_at === null || body?.end_at === ''
      ? null
      : typeof body?.end_at === 'string'
        ? body.end_at
        : undefined;

  if (!start_at) {
    return NextResponse.json({ error: 'Нужны start_at или auto_shift: true' }, { status: 400 });
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
}

/**
 * PATCH / POST /api/admin/team-schedule/session
 * Сдвиг времени выезда. POST — для прокси, которые режут PATCH.
 */
export async function PATCH(request: NextRequest) {
  try {
    return await handleSessionShift(request);
  } catch (e) {
    console.error('PATCH /api/admin/team-schedule/session', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleSessionShift(request);
  } catch (e) {
    console.error('POST /api/admin/team-schedule/session', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
