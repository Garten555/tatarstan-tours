import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import { runAutoScheduleForTour } from '@/lib/tour/run-auto-schedule-for-tour';

/**
 * POST /api/admin/tours/auto-schedule/bulk
 * Заполняет расписание для активных туров (draft/active/published).
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
      .in('status', ['draft', 'active'])
      .order('title', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results: Array<{
      tourId: string;
      title: string;
      added: number;
      error?: string;
    }> = [];

    for (const row of tours ?? []) {
      const tourId = (row as { id: string }).id;
      const title = String((row as { title?: string }).title || tourId);

      const result = await runAutoScheduleForTour(serviceClient, {
        tourId,
        actor: auth.user,
        apply,
      });

      if (!result.ok) {
        results.push({ tourId, title, added: 0, error: result.error });
        continue;
      }

      results.push({
        tourId,
        title,
        added: result.generated.newSlots.length,
      });
    }

    const totalAdded = results.reduce((s, r) => s + r.added, 0);
    const failed = results.filter((r) => r.error);

    return NextResponse.json({
      success: true,
      applied: apply,
      toursProcessed: results.length,
      totalSlotsAdded: totalAdded,
      failed: failed.length,
      results,
    });
  } catch (e) {
    console.error('POST bulk auto-schedule', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
