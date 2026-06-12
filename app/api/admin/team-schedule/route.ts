import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireScheduleViewer } from '@/lib/admin/require-schedule-viewer';
import {
  currentMoscowWeekStart,
  moscowWeekDays,
  moscowWeekRangeIso,
  parseMoscowDayKey,
} from '@/lib/tour/team-schedule-range';
import { guideHasConflict, type BusyGuideSession } from '@/lib/tour/guide-schedule-conflict';
import { sessionEndMs } from '@/lib/tour/schedule-slot';

type SessionRow = {
  id: string;
  start_at: string;
  end_at: string | null;
  status: string;
  guide_id: string | null;
  tour_id: string;
  tour: { id: string; title: string; slug: string } | { id: string; title: string; slug: string }[] | null;
  guide:
    | { id: string; first_name: string | null; last_name: string | null }
    | { id: string; first_name: string | null; last_name: string | null }[]
    | null;
};

function unwrap<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function guideName(
  guide: { first_name: string | null; last_name: string | null } | null
): string {
  if (!guide) return 'Гид не назначен';
  const name = [guide.first_name, guide.last_name].filter(Boolean).join(' ').trim();
  return name || 'Гид';
}

/**
 * GET /api/admin/team-schedule?week=2026-06-02&guide_id=...
 * Недельное расписание выездов для гидов и админов туров.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireScheduleViewer(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const weekParam = request.nextUrl.searchParams.get('week');
    const guideFilter = request.nextUrl.searchParams.get('guide_id');

    const weekStart = parseMoscowDayKey(weekParam) ?? currentMoscowWeekStart();
    const { from, to } = moscowWeekRangeIso(weekStart);
    const days = moscowWeekDays(weekStart);

    let query = serviceClient
      .from('tour_sessions')
      .select(
        `
        id,
        start_at,
        end_at,
        status,
        guide_id,
        tour_id,
        tour:tours(id, title, slug),
        guide:profiles(id, first_name, last_name)
      `
      )
      .gte('start_at', from)
      .lt('start_at', to)
      .neq('status', 'cancelled')
      .order('start_at', { ascending: true });

    if (auth.role === 'guide') {
      query = query.eq('guide_id', auth.user.id);
    } else if (guideFilter && guideFilter !== 'all') {
      if (guideFilter === 'unassigned') {
        query = query.is('guide_id', null);
      } else {
        query = query.eq('guide_id', guideFilter);
      }
    }

    const { data: sessionsRaw, error } = await query;

    if (error) {
      console.error('GET /api/admin/team-schedule', error);
      return NextResponse.json({ error: 'Не удалось загрузить расписание' }, { status: 500 });
    }

    const tourIds = [
      ...new Set(
        (sessionsRaw ?? []).map((row) => (row as { tour_id: string }).tour_id).filter(Boolean)
      ),
    ];

    const roomByTour = new Map<string, string>();
    if (tourIds.length > 0) {
      const { data: rooms } = await serviceClient
        .from('tour_rooms')
        .select('id, tour_id')
        .in('tour_id', tourIds);

      for (const room of rooms ?? []) {
        const tourId = (room as { tour_id: string }).tour_id;
        const roomId = (room as { id: string }).id;
        if (!roomByTour.has(tourId)) roomByTour.set(tourId, roomId);
      }
    }

    const busyForConflict: BusyGuideSession[] = (sessionsRaw ?? [])
      .filter((row) => (row as { guide_id?: string | null }).guide_id)
      .map((row) => ({
        id: (row as { id: string }).id,
        guide_id: (row as { guide_id: string }).guide_id,
        start_at: (row as { start_at: string }).start_at,
        end_at: (row as { end_at: string | null }).end_at ?? null,
        tour_id: (row as { tour_id: string }).tour_id,
      }));

    const sessions = (sessionsRaw ?? []).map((row) => {
      const typed = row as SessionRow;
      const tour = unwrap(typed.tour);
      const guide = unwrap(typed.guide);
      const startMs = new Date(typed.start_at).getTime();
      const endMs = sessionEndMs(startMs, typed.end_at, 180);

      const hasConflict =
        typed.guide_id != null &&
        guideHasConflict(busyForConflict, typed.guide_id, startMs, endMs, typed.id);

      return {
        id: typed.id,
        start_at: typed.start_at,
        end_at: typed.end_at,
        status: typed.status,
        guide_id: typed.guide_id,
        guide_name: guideName(guide),
        tour: tour
          ? { id: tour.id, title: tour.title, slug: tour.slug }
          : { id: typed.tour_id, title: 'Тур', slug: '' },
        room_id: roomByTour.get(typed.tour_id) ?? null,
        has_conflict: Boolean(hasConflict),
      };
    });

    let guides: Array<{ id: string; name: string }> = [];
    if (auth.role === 'tour_admin' || auth.role === 'super_admin') {
      const { data: guideProfiles } = await serviceClient
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'guide')
        .eq('is_banned', false)
        .order('first_name')
        .limit(200);

      guides = (guideProfiles ?? []).map((g) => ({
        id: (g as { id: string }).id,
        name: guideName(g as { first_name: string | null; last_name: string | null }),
      }));
    }

    return NextResponse.json({
      week_start: weekStart.key,
      days: days.map((d) => ({ key: d.key, weekday: d.weekday })),
      sessions,
      guides,
      viewer: { role: auth.role, user_id: auth.user.id },
    });
  } catch (e) {
    console.error('GET /api/admin/team-schedule', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
