import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireTourManager } from '@/lib/admin/require-tour-manager';
import {
  DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG,
  normalizeTourAutoScheduleConfig,
} from '@/lib/tour/auto-schedule-config';
import {
  loadTourAutoScheduleConfig,
  saveTourAutoScheduleConfig,
} from '@/lib/tour/auto-schedule-settings';

export async function GET() {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireTourManager(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = await loadTourAutoScheduleConfig(serviceClient);
    return NextResponse.json({ success: true, config, defaults: DEFAULT_TOUR_AUTO_SCHEDULE_CONFIG });
  } catch (e) {
    console.error('GET tour-auto-schedule settings', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireTourManager(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const config = normalizeTourAutoScheduleConfig(body?.config ?? body);
    await saveTourAutoScheduleConfig(serviceClient, config);

    return NextResponse.json({ success: true, config });
  } catch (e) {
    console.error('PUT tour-auto-schedule settings', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
