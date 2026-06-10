import type { SupabaseClient } from '@supabase/supabase-js';

import type { TourRoomReportRow } from '@/components/admin/TourRoomMessageReportsList';
import { profileDisplayName } from '@/lib/profile/display';

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    /tour_room_message_reports|relation.*does not exist/i.test(error.message || '')
  );
}

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42703' ||
    /is_reported|reported_at|deleted_at|reported_by|report_reason/i.test(error.message || '')
  );
}

type ProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_banned?: boolean | null;
};

async function loadProfiles(
  serviceClient: SupabaseClient,
  ids: string[]
): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  if (ids.length === 0) return map;

  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id, first_name, last_name, email, avatar_url, role, is_banned')
    .in('id', ids);

  for (const p of (profiles || []) as ProfileRow[]) {
    map.set(p.id, p);
  }
  return map;
}

async function loadTourTitlesByRoom(
  serviceClient: SupabaseClient,
  roomIds: string[]
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (roomIds.length === 0) return titles;

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
    titles.set(roomId, tourId ? tourTitleById.get(tourId) || 'Тур' : 'Тур');
  }

  return titles;
}

async function fetchFromReportsTable(
  serviceClient: SupabaseClient
): Promise<{ rows: TourRoomReportRow[]; error: string | null; tableMissing: boolean }> {
  const { data: reportRows, error } = await serviceClient
    .from('tour_room_message_reports')
    .select('id, message_id, room_id, reporter_id, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTableError(error)) {
      return { rows: [], error: null, tableMissing: true };
    }
    return { rows: [], error: error.message, tableMissing: false };
  }

  type ReportRow = {
    id: string;
    message_id: string;
    room_id: string;
    reporter_id: string;
    reason: string | null;
    created_at: string;
  };

  const list = (reportRows || []) as ReportRow[];
  if (list.length === 0) {
    return { rows: [], error: null, tableMissing: false };
  }

  const messageIds = [...new Set(list.map((r) => r.message_id))];
  const messagesResWithDeleted = await serviceClient
    .from('tour_room_messages')
    .select('id, room_id, user_id, message, image_url, created_at, deleted_at')
    .in('id', messageIds);

  const messagesRes =
    messagesResWithDeleted.error && isMissingColumnError(messagesResWithDeleted.error)
      ? await serviceClient
          .from('tour_room_messages')
          .select('id, room_id, user_id, message, image_url, created_at')
          .in('id', messageIds)
      : messagesResWithDeleted;

  const messageMap = new Map<
    string,
    {
      id: string;
      user_id: string | null;
      message: string | null;
      image_url: string | null;
      created_at: string;
      deleted_at?: string | null;
    }
  >();

  for (const msg of (messagesRes.data || []) as {
    id: string;
    user_id: string | null;
    message: string | null;
    image_url: string | null;
    created_at: string;
    deleted_at?: string | null;
  }[]) {
    if (msg.deleted_at) continue;
    messageMap.set(msg.id, msg);
  }

  const authorIds = [...messageMap.values()]
    .map((m) => m.user_id)
    .filter((id): id is string => Boolean(id));
  const reporterIds = list.map((r) => r.reporter_id);
  const roomIds = [...new Set(list.map((r) => r.room_id))];

  const profileMap = await loadProfiles(serviceClient, [...new Set([...authorIds, ...reporterIds])]);
  const roomTourTitle = await loadTourTitlesByRoom(serviceClient, roomIds);

  const rows: TourRoomReportRow[] = [];
  for (const r of list) {
    const msg = messageMap.get(r.message_id);
    if (!msg) continue;

    const author = msg.user_id ? profileMap.get(msg.user_id) : undefined;
    const rep = profileMap.get(r.reporter_id);

    rows.push({
      id: r.id,
      room_id: r.room_id,
      message: msg.message,
      image_url: msg.image_url,
      created_at: msg.created_at,
      reported_at: r.created_at,
      report_reason: r.reason,
      author_user_id: author?.id || msg.user_id || '',
      author_role: author?.role ?? null,
      author_is_banned: Boolean(author?.is_banned),
      author_label: profileDisplayName(author, 'Участник'),
      author_email: author?.email ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      reporter_user_id: r.reporter_id,
      reporter_role: rep?.role ?? null,
      reporter_label: profileDisplayName(rep, 'Пользователь'),
      reporter_email: rep?.email ?? null,
      reporter_avatar_url: rep?.avatar_url ?? null,
      tour_title: roomTourTitle.get(r.room_id) || 'Тур',
    });
  }

  return { rows, error: null, tableMissing: false };
}

async function fetchFromMessageFlags(
  serviceClient: SupabaseClient
): Promise<{ rows: TourRoomReportRow[]; error: string | null }> {
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
  if (error && isMissingColumnError(error)) {
    ({ data: rawMessages, error } = await buildQuery());
  }

  if (error) {
    if (isMissingColumnError(error)) {
      return { rows: [], error: null };
    }
    return { rows: [], error: error.message };
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
    return { rows: [], error: null };
  }

  const authorIds = [...new Set(list.map((m) => m.user_id).filter((id): id is string => Boolean(id)))];
  const reporterIds = [...new Set(list.map((m) => m.reported_by).filter((id): id is string => Boolean(id)))];
  const roomIds = [...new Set(list.map((m) => m.room_id))];

  const profileMap = await loadProfiles(serviceClient, [...new Set([...authorIds, ...reporterIds])]);
  const roomTourTitle = await loadTourTitlesByRoom(serviceClient, roomIds);

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
      author_email: author?.email ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      reporter_user_id: m.reported_by,
      reporter_role: rep?.role ?? null,
      reporter_label: m.reported_by ? profileDisplayName(rep, 'Пользователь') : '—',
      reporter_email: rep?.email ?? null,
      reporter_avatar_url: rep?.avatar_url ?? null,
      tour_title: roomTourTitle.get(m.room_id) || 'Тур',
    };
  });

  return { rows, error: null };
}

function mergeReportRows(
  tableRows: TourRoomReportRow[],
  legacyRows: TourRoomReportRow[]
): TourRoomReportRow[] {
  const seen = new Map<string, TourRoomReportRow>();

  for (const row of [...tableRows, ...legacyRows]) {
    const key = `${row.room_id}:${row.reporter_user_id ?? ''}:${row.created_at}:${row.message ?? row.id}`;
    const existing = seen.get(key);
    const rowTs = new Date(row.reported_at || row.created_at).getTime();
    const existingTs = existing
      ? new Date(existing.reported_at || existing.created_at).getTime()
      : 0;
    if (!existing || rowTs >= existingTs) {
      seen.set(key, row);
    }
  }

  return [...seen.values()]
    .sort(
      (a, b) =>
        new Date(b.reported_at || b.created_at).getTime() -
        new Date(a.reported_at || a.created_at).getTime()
    )
    .slice(0, 200);
}

export type FetchTourRoomReportsResult = {
  rows: TourRoomReportRow[];
  error: string | null;
  setupHint: string | null;
};

export async function fetchTourRoomMessageReports(
  serviceClient: SupabaseClient
): Promise<FetchTourRoomReportsResult> {
  const fromTable = await fetchFromReportsTable(serviceClient);
  const legacy = await fetchFromMessageFlags(serviceClient);

  if (fromTable.error && legacy.error) {
    return { rows: [], error: fromTable.error || legacy.error, setupHint: null };
  }

  const rows = mergeReportRows(fromTable.rows, legacy.rows);

  if (rows.length > 0) {
    return { rows, error: null, setupHint: null };
  }

  if (fromTable.tableMissing && legacy.error) {
    return {
      rows: [],
      error: legacy.error,
      setupHint: 'database/snippets/010_tour_room_message_reports_table.sql',
    };
  }

  if (fromTable.tableMissing) {
    return {
      rows: [],
      error: null,
      setupHint: 'database/snippets/010_tour_room_message_reports_table.sql',
    };
  }

  return { rows: [], error: legacy.error, setupHint: null };
}
