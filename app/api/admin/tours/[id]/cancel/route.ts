import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { cancelTourDepartures } from '@/lib/tour/cancel-tour-departure';

/**
 * POST /api/admin/tours/[id]/cancel — отмена всего тура или одного выезда (session_id).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tourId } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const role = (profile as { role?: string | null } | null)?.role;
    if (role !== 'tour_admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let reason: string | undefined;
    let sessionId: string | undefined;
    let cancelAll = false;

    try {
      const body = await request.json();
      if (body && typeof body.reason === 'string') reason = body.reason.trim() || undefined;
      if (body && typeof body.session_id === 'string' && body.session_id.trim()) {
        sessionId = body.session_id.trim();
      }
      if (body && body.cancel_all === true) cancelAll = true;
    } catch {
      /* empty body */
    }

    const result = await cancelTourDepartures(serviceClient, {
      tourId,
      sessionId,
      cancelAll,
      reason,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/admin/tours/[id]/cancel', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
