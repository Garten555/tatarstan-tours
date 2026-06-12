import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import { loadActiveGuideIds } from '@/lib/tour/auto-schedule-settings';
import { runAutoScheduleForTour } from '@/lib/tour/run-auto-schedule-for-tour';

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

    const { data: tours, error } = await serviceClient
      .from('tours')
      .select('id, title, status')
      .in('status', ['draft', 'active', 'completed', 'cancelled'])
      .order('title', { ascending: true });

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
      let note: string | undefined;
      if (g.newSlots.length === 0) {
        if (g.zeroReason === 'already_full') {
          note = `уже ${g.existingFutureCount} будущих слотов (лимит ${g.targetSlots})`;
        } else if (g.zeroReason === 'no_guides') {
          note = 'нет активных гидов — добавьте роль guide';
        } else if (g.skippedNoGuide > 0) {
          note = `нет свободного гида (${g.skippedNoGuide} пропусков)`;
        } else {
          note = 'нет свободных дат в горизонте';
        }
      }

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
