import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { TourRoomReportRow } from '@/components/admin/TourRoomMessageReportsList';
import { profileDisplayName } from '@/lib/profile/display';

export async function GET() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

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

  const buildQuery = () =>
    serviceClient
      .from('tour_room_messages')
      .select(
        'id, room_id, user_id, message, image_url, created_at, reported_at, report_reason, reported_by'
      )
      .eq('is_reported', true)
      .order('reported_at', { ascending: false })
      .limit(200);

  let { data: rawMessages, error } = await buildQuery().is('deleted_at', null);
  if (error?.code === '42703') {
    ({ data: rawMessages, error } = await buildQuery());
  }

  if (error) {
    const missingColumn =
      error.code === '42703' ||
      /is_reported|reported_at|deleted_at/i.test(error.message || '');
    return NextResponse.json(
      {
        error: missingColumn
          ? 'В базе нет полей для жалоб. Выполните database/migrations/009_tour_room_message_reports.sql в Supabase.'
          : error.message,
        rows: [],
      },
      { status: missingColumn ? 503 : 500 }
    );
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
  };

  const list = (rawMessages || []) as RawMsg[];
  if (list.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const authorIds = [...new Set(list.map((m) => m.user_id).filter((id): id is string => Boolean(id)))];
  const reporterIds = [...new Set(list.map((m) => m.reported_by).filter((id): id is string => Boolean(id)))];
  const roomIds = [...new Set(list.map((m) => m.room_id))];

  const profileIds = [...new Set([...authorIds, ...reporterIds])];

  type ProfileRow = {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role?: string | null;
    is_banned?: boolean | null;
  };

  const profileMap = new Map<string, ProfileRow>();
  if (profileIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, first_name, last_name, email, role, is_banned')
      .in('id', profileIds);
    for (const p of (profiles || []) as ProfileRow[]) {
      profileMap.set(p.id, p);
    }
  }

  const roomTourTitle = new Map<string, string>();
  if (roomIds.length > 0) {
    const { data: rooms } = await serviceClient
      .from('tour_rooms')
      .select('id, tour_id')
      .in('id', roomIds);
    const tourIds = [
      ...new Set(
        ((rooms || []) as { id: string; tour_id: string | null }[])
          .map((r) => r.tour_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const roomToTour = new Map(
      ((rooms || []) as { id: string; tour_id: string | null }[]).map((r) => [r.id, r.tour_id])
    );
    const tourTitleById = new Map<string, string>();
    if (tourIds.length > 0) {
      const { data: tours } = await serviceClient.from('tours').select('id, title').in('id', tourIds);
      for (const t of (tours || []) as { id: string; title: string | null }[]) {
        tourTitleById.set(t.id, t.title || 'Тур');
      }
    }
    for (const roomId of roomIds) {
      const tourId = roomToTour.get(roomId);
      roomTourTitle.set(roomId, tourId ? tourTitleById.get(tourId) || 'Тур' : 'Тур');
    }
  }

  const rows: TourRoomReportRow[] = list.map((m) => {
    const author = m.user_id ? profileMap.get(m.user_id) : undefined;
    const rep = m.reported_by ? profileMap.get(m.reported_by) : undefined;

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
      author_label: profileDisplayName(author, 'Участник'),
      reporter_user_id: m.reported_by,
      reporter_role: rep?.role ?? null,
      reporter_label: m.reported_by ? profileDisplayName(rep, 'Пользователь') : '—',
      tour_title: roomTourTitle.get(m.room_id) || 'Тур',
    };
  });

  return NextResponse.json({ rows });
}
