import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensureTourRoomForSession } from '@/lib/tour/ensure-session-room';

type IncomingSession = {
  id?: string;
  start_at: string;
  end_at?: string | null;
  /** UUID профиля гида или null — гид на этом выезде */
  guide_id?: string | null;
};

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = (profile as { role?: string | null } | null)?.role;
    if (role !== 'tour_admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const sessions = (body?.sessions ?? []) as IncomingSession[];

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json(
        { error: 'Передайте массив sessions с хотя бы одним выездом' },
        { status: 400 }
      );
    }

    const { data: tour, error: tourErr } = await serviceClient
      .from('tours')
      .select('id, max_participants')
      .eq('id', tourId)
      .single();

    if (tourErr || !tour) {
      return NextResponse.json({ error: 'Тур не найден' }, { status: 404 });
    }

    const maxP = (tour as { max_participants: number }).max_participants;

    const { data: existing, error: exErr } = await serviceClient
      .from('tour_sessions')
      .select('id')
      .eq('tour_id', tourId);

    const guideColumnMissing = (msg: string) =>
      /guide_id|schema cache|column/i.test(msg);

    if (exErr) {
      console.error('[sessions/sync]', exErr);
      return NextResponse.json(
        {
          error:
            'Не удалось прочитать tour_sessions. Выполните миграции tour_sessions в Supabase.',
          details: exErr.message,
        },
        { status: 500 }
      );
    }

    const existingRows = existing ?? [];
    const incomingIds = new Set(
      sessions.map((s) => s.id).filter(Boolean) as string[]
    );

    for (const row of existingRows) {
      if (incomingIds.has(row.id)) continue;
      const { count, error: cntErr } = await serviceClient
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', row.id);
      if (cntErr) continue;
      if ((count ?? 0) > 0) continue;
      await serviceClient.from('tour_sessions').delete().eq('id', row.id);
    }

    const normalizeGuideId = (v: unknown): string | null => {
      if (v === undefined || v === null || v === '') return null;
      if (typeof v === 'string') return v;
      return null;
    };

    for (const s of sessions) {
      const start_at = s.start_at;
      const end_at = s.end_at ?? null;
      const guide_id = normalizeGuideId(s.guide_id);
      if (!start_at) {
        return NextResponse.json({ error: 'У каждого слота нужна start_at' }, { status: 400 });
      }

      const knownId = s.id && existingRows.some((r) => r.id === s.id);

      if (knownId && s.id) {
        const updatePayload: Record<string, unknown> = {
          start_at,
          end_at,
          max_participants: maxP,
          guide_id,
        };
        let { error: upErr } = await serviceClient
          .from('tour_sessions')
          .update(updatePayload)
          .eq('id', s.id)
          .eq('tour_id', tourId);

        if (upErr && guideColumnMissing(upErr.message ?? '')) {
          delete updatePayload.guide_id;
          upErr = (
            await serviceClient
              .from('tour_sessions')
              .update(updatePayload)
              .eq('id', s.id)
              .eq('tour_id', tourId)
          ).error;
        }

        if (upErr) {
          console.error('[sessions/sync] update', upErr);
          return NextResponse.json(
            { error: 'Не удалось обновить слот', details: upErr.message },
            { status: 500 }
          );
        }
      } else {
        const insertPayload: Record<string, unknown> = {
          tour_id: tourId,
          start_at,
          end_at,
          max_participants: maxP,
          current_participants: 0,
          status: 'active',
          guide_id,
        };
        let { error: insErr } = await serviceClient.from('tour_sessions').insert(insertPayload);
        if (insErr && guideColumnMissing(insErr.message ?? '')) {
          delete insertPayload.guide_id;
          insErr = (await serviceClient.from('tour_sessions').insert(insertPayload)).error;
        }
        if (insErr) {
          console.error('[sessions/sync] insert', insErr);
          return NextResponse.json(
            { error: 'Не удалось добавить слот', details: insErr.message },
            { status: 500 }
          );
        }
      }
    }

    const { data: sessionsAfter, error: sessAfterErr } = await serviceClient
      .from('tour_sessions')
      .select('id, guide_id')
      .eq('tour_id', tourId);

    if (!sessAfterErr && sessionsAfter?.length) {
      for (const row of sessionsAfter) {
        const sid = (row as { id: string }).id;
        const gid = (row as { guide_id?: string | null }).guide_id ?? null;
        const res = await ensureTourRoomForSession(serviceClient, {
          tourId,
          sessionId: sid,
          guideId: gid,
          createdBy: user.id,
        });
        if (!res.ok && !/relation|column|schema/i.test(res.error ?? '')) {
          console.warn('[sessions/sync] ensure room', sid, res.error);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/admin/tours/[id]/sessions', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
