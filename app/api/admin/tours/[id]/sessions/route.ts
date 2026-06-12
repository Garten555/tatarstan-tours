import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import { syncTourSessions, type IncomingSession } from '@/lib/tour/sync-tour-sessions';

/**
 * GET /api/admin/tours/[id]/sessions — список выездов тура (для отмены и админки).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tourId } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireTourManager(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: sessions, error } = await serviceClient
      .from('tour_sessions')
      .select('id, start_at, end_at, status, guide_id')
      .eq('tour_id', tourId)
      .order('start_at', { ascending: true });

    if (error) {
      console.error('GET /api/admin/tours/[id]/sessions', error);
      return NextResponse.json({ error: 'Не удалось загрузить выезды' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (e) {
    console.error('GET /api/admin/tours/[id]/sessions', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Синхронизация выездов тура с таблицей tour_sessions (один тур — несколько дат).
 * POST /api/admin/tours/[id]/sessions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tourId } = await params;
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireTourManager(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const sessions = (body?.sessions ?? []) as IncomingSession[];

    const result = await syncTourSessions(serviceClient, {
      tourId,
      sessions,
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
    console.error('POST /api/admin/tours/[id]/sessions', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
