import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { TourRoomReportRow } from '@/components/admin/TourRoomMessageReportsList';

function unwrapRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

function profileLabel(
  p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null,
  fallback: string
) {
  if (!p) return fallback;
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || p.email || fallback;
}

export async function GET() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const role = (profile as { role?: string } | null)?.role ?? 'user';
  if (!['super_admin', 'support_admin', 'tour_admin'].includes(role)) {
    return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
  }

  const { data: rawMessages, error } = await serviceClient
    .from('tour_room_messages')
    .select(
      `
      id,
      room_id,
      user_id,
      message,
      image_url,
      created_at,
      reported_at,
      report_reason,
      reported_by,
      author:profiles!tour_room_messages_user_id_fkey(id, first_name, last_name, email, role, is_banned),
      room:tour_rooms(
        id,
        tour:tours(title)
      )
    `
    )
    .eq('is_reported', true)
    .is('deleted_at', null)
    .order('reported_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message, rows: [] }, { status: 500 });
  }

  type RawMsg = {
    id: string;
    room_id: string;
    user_id: string | null;
    message: string | null;
    image_url: string | null;
    created_at: string;
    reported_at: string | null;
    report_reason: string | null;
    reported_by: string | null;
    author?: unknown;
    room?: unknown;
  };

  const list = (rawMessages || []) as RawMsg[];
  const reporterIds = [...new Set(list.map((m) => m.reported_by).filter((id): id is string => Boolean(id)))];

  const reporterMap = new Map<string, string>();
  type ReporterRow = {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  let reporterRows: ReporterRow[] = [];
  if (reporterIds.length > 0) {
    const { data: reporters } = await serviceClient
      .from('profiles')
      .select('id, first_name, last_name, email, role, is_banned')
      .in('id', reporterIds);

    reporterRows = (reporters || []) as ReporterRow[];
    for (const r of reporterRows) {
      reporterMap.set(r.id, profileLabel(r, 'Пользователь'));
    }
  }

  const rows: TourRoomReportRow[] = list.map((m) => {
    const author = unwrapRelation(m.author) as {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      role?: string | null;
      is_banned?: boolean | null;
    } | null;
    const room = unwrapRelation(m.room) as {
      tour?: { title?: string | null } | { title?: string | null }[];
    } | null;
    const tour = unwrapRelation(room?.tour);
    const tourTitle =
      tour && typeof tour === 'object' && 'title' in tour && typeof tour.title === 'string'
        ? tour.title
        : 'Тур';

    const rep = m.reported_by ? reporterRows.find((x) => x.id === m.reported_by) : undefined;

    return {
      id: m.id,
      room_id: m.room_id,
      message: m.message,
      image_url: m.image_url,
      created_at: m.created_at,
      reported_at: m.reported_at,
      report_reason: m.report_reason,
      author_user_id: author?.id || m.user_id || '',
      author_role: author?.role ?? null,
      author_is_banned: Boolean(author?.is_banned),
      author_label: profileLabel(author, 'Участник'),
      reporter_user_id: m.reported_by,
      reporter_role: rep?.role ?? null,
      reporter_label: m.reported_by ? reporterMap.get(m.reported_by) || 'Пользователь' : '—',
      tour_title: tourTitle,
    };
  });

  return NextResponse.json({ rows });
}
