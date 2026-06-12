import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireScheduleViewer } from '@/lib/admin/require-schedule-viewer';
import {
  currentMoscowDay,
  moscowMonthCalendarCells,
  moscowMonthRangeIso,
  moscowWeekDays,
  moscowWeekRangeIso,
  parseMoscowDayKey,
  parseMoscowMonthKey,
  currentMoscowWeekStart,
} from '@/lib/tour/team-schedule-range';
import {
  findGuideScheduleConflict,
  GUIDE_BETWEEN_TOURS_BUFFER_MINUTES,
  scheduleIssueMessage,
  type BusyGuideSession,
} from '@/lib/tour/guide-schedule-conflict';
import { sessionEndMs } from '@/lib/tour/schedule-slot';

type SessionRow = {
  id: string;
  start_at: string;
  end_at: string | null;
  status: string;
  guide_id: string | null;
  tour_id: string;
  tour:
    | { id: string; title: string; slug: string; cover_image: string | null }
    | { id: string; title: string; slug: string; cover_image: string | null }[]
    | null;
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

function sessionMoscowDayKey(startAt: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startAt));
}

/**
 * GET /api/admin/team-schedule?month=2026-06&guide_id=...
 * GET /api/admin/team-schedule?week=2026-06-02 (устаревший режим недели)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const auth = await requireScheduleViewer(supabase);
    if (!auth) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const monthParam = request.nextUrl.searchParams.get('month');
    const weekParam = request.nextUrl.searchParams.get('week');
    const guideFilter = request.nextUrl.searchParams.get('guide_id');

    const parsedMonth = parseMoscowMonthKey(monthParam);
    const useMonth = Boolean(parsedMonth);
    const today = currentMoscowDay();

    let from: string;
    let to: string;
    let monthKey: string;
    let calendarCells: ReturnType<typeof moscowMonthCalendarCells>;

    if (useMonth && parsedMonth) {
      monthKey = parsedMonth.key;
      const range = moscowMonthRangeIso(parsedMonth.year, parsedMonth.month);
      from = range.from;
      to = range.to;
      calendarCells = moscowMonthCalendarCells(parsedMonth.year, parsedMonth.month);
    } else {
      const weekStart = parseMoscowDayKey(weekParam) ?? currentMoscowWeekStart();
      const range = moscowWeekRangeIso(weekStart);
      from = range.from;
      to = range.to;
      monthKey = `${weekStart.year}-${String(weekStart.month).padStart(2, '0')}`;
      calendarCells = moscowMonthCalendarCells(weekStart.year, weekStart.month);
    }

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
        tour:tours(id, title, slug, cover_image),
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

    const dayMarkers: Record<
      string,
      { count: number; has_overlap: boolean; has_buffer: boolean }
    > = {};

    const sessions = (sessionsRaw ?? []).map((row) => {
      const typed = row as SessionRow;
      const tour = unwrap(typed.tour);
      const guide = unwrap(typed.guide);
      const startMs = new Date(typed.start_at).getTime();
      const endMs = sessionEndMs(startMs, typed.end_at, 180);

      const conflictDetail =
        typed.guide_id != null
          ? findGuideScheduleConflict(
              busyForConflict,
              typed.guide_id,
              startMs,
              endMs,
              typed.id
            )
          : null;

      const dayKey = sessionMoscowDayKey(typed.start_at);
      if (!dayMarkers[dayKey]) {
        dayMarkers[dayKey] = { count: 0, has_overlap: false, has_buffer: false };
      }
      dayMarkers[dayKey].count += 1;
      if (conflictDetail?.issue === 'overlap') dayMarkers[dayKey].has_overlap = true;
      if (conflictDetail?.issue === 'buffer') dayMarkers[dayKey].has_buffer = true;

      return {
        id: typed.id,
        start_at: typed.start_at,
        end_at: typed.end_at,
        status: typed.status,
        guide_id: typed.guide_id,
        guide_name: guideName(guide),
        tour: tour
          ? {
              id: tour.id,
              title: tour.title,
              slug: tour.slug,
              cover_image: tour.cover_image,
            }
          : { id: typed.tour_id, title: 'Тур', slug: '', cover_image: null },
        room_id: roomByTour.get(typed.tour_id) ?? null,
        schedule_issue: conflictDetail?.issue ?? null,
        gap_minutes: conflictDetail?.gap_minutes ?? null,
        issue_message: conflictDetail
          ? scheduleIssueMessage(conflictDetail.issue, conflictDetail.gap_minutes)
          : null,
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

    const legacyWeekStart = parseMoscowDayKey(weekParam) ?? currentMoscowWeekStart();

    return NextResponse.json({
      mode: useMonth ? 'month' : 'week',
      month: monthKey,
      today: today.key,
      calendar_cells: calendarCells.map((c) => ({
        key: c.key,
        day: c.day,
        weekday: c.weekday,
        in_month: c.in_month,
      })),
      day_markers: dayMarkers,
      week_start: legacyWeekStart.key,
      days: moscowWeekDays(legacyWeekStart).map((d) => ({ key: d.key, weekday: d.weekday })),
      sessions,
      guides,
      buffer_minutes: GUIDE_BETWEEN_TOURS_BUFFER_MINUTES,
      viewer: { role: auth.role, user_id: auth.user.id },
    });
  } catch (e) {
    console.error('GET /api/admin/team-schedule', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
