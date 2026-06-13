import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import { loadActiveGuideIds } from '@/lib/tour/auto-schedule-settings';
import { runAutoScheduleForTour } from '@/lib/tour/run-auto-schedule-for-tour';

async function loadBulkTourRows(serviceClient: Awaited<ReturnType<typeof createServiceClient>>) {
  return serviceClient
    .from('tours')
    .select('id, title, status')
    .in('status', ['draft', 'active', 'completed', 'cancelled'])
    .order('title', { ascending: true });
}

function noteForGenerated(g: {
  newSlots: unknown[];
  existingFutureCount: number;
  targetSlots: number;
  zeroReason?: string;
  skippedNoGuide?: number;
}): string | undefined {
  if (g.newSlots.length > 0) return undefined;
  if (g.zeroReason === 'already_full') {
    return `уже ${g.existingFutureCount} будущих слотов (лимит ${g.targetSlots})`;
  }
  if (g.zeroReason === 'no_guides') {
    return 'нет активных гидов — добавьте роль guide';
  }
  if ((g.skippedNoGuide ?? 0) > 0) {
    return `нет свободного гида (${g.skippedNoGuide} пропусков)`;
  }
  return 'нет свободных дат в горизонте';
}

/**
 * GET /api/admin/tours/auto-schedule/bulk — список туров для пошагового заполнения на клиенте.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireTourManager(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: tours, error } = await loadBulkTourRows(serviceClient);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const guideIds = await loadActiveGuideIds(serviceClient);

    return NextResponse.json({
      success: true,
      tours: (tours ?? []).map((row) => ({
        id: (row as { id: string }).id,
        title: String((row as { title?: string }).title || (row as { id: string }).id),
      })),
      activeGuides: guideIds.length,
    });
  } catch (e) {
    console.error('GET bulk auto-schedule', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/tours/auto-schedule/bulk
 * Заполняет расписание для черновиков, активных, завершённых и отменённых туров.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireTourManager(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const apply = body?.apply !== false;

    const { data: tours, error } = await loadBulkTourRows(serviceClient);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: Array<{
      tourId: string;
      title: string;
      added: number;
      existingFuture: number;
      target: number;
      note?: string;
      error?: string;
    }> = [];

    const guideIds = await loadActiveGuideIds(serviceClient);

    for (const row of tours ?? []) {
      const tourId = (row as { id: string }).id;
      const title = String((row as { title?: string }).title || tourId);

      const result = await runAutoScheduleForTour(serviceClient, {
        tourId,
        actor: auth.user,
        apply,
      });

      if (!result.ok) {
        results.push({
          tourId,
          title,
          added: 0,
          existingFuture: 0,
          target: 0,
          error: result.error,
        });
        continue;
      }

      const g = result.generated;
      const note = noteForGenerated(g);

      results.push({
        tourId,
        title,
        added: g.newSlots.length,
        existingFuture: g.existingFutureCount,
        target: g.targetSlots,
        note,
      });
    }

    const totalAdded = results.reduce((s, r) => s + r.added, 0);
    const failed = results.filter((r) => r.error);
    const alreadyFull = results.filter((r) => r.note?.startsWith('уже')).length;

    return NextResponse.json({
      success: true,
      applied: apply,
      toursProcessed: results.length,
      totalSlotsAdded: totalAdded,
      failed: failed.length,
      alreadyFull,
      activeGuides: guideIds.length,
      results,
    });
  } catch (e) {
    console.error('POST bulk auto-schedule', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
