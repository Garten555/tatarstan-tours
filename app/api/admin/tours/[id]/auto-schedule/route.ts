import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import { normalizeTourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import { runAutoScheduleForTour } from '@/lib/tour/run-auto-schedule-for-tour';

/**
 * POST /api/admin/tours/[id]/auto-schedule
 * body: { apply?: boolean, config?: partial override }
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

    const body = await request.json().catch(() => ({}));
    const apply = Boolean(body?.apply);
    const configOverride = body?.config
      ? normalizeTourAutoScheduleConfig(body.config)
      : undefined;
    const targetMonth =
      typeof body?.targetMonth === 'string' ? body.targetMonth : undefined;
    const monthMode =
      body?.monthMode === 'regenerate' ? 'regenerate' : 'fill';
    const monthScope =
      body?.monthScope === 'all_scheduled' ? 'all_scheduled' : 'single';

    const result = await runAutoScheduleForTour(serviceClient, {
      tourId,
      actor: auth.user,
      apply,
      configOverride,
      targetMonth,
      monthMode,
      monthScope,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      applied: result.applied,
      tourTitle: result.tourTitle,
      catalogDatesUpdated: result.catalogDatesUpdated,
      ...result.generated,
    });
  } catch (e) {
    console.error('POST auto-schedule', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
