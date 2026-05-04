import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import TourRoomMessageReportsPanel from '@/components/admin/TourRoomMessageReportsPanel';
import { type TourRoomReportRow } from '@/components/admin/TourRoomMessageReportsList';
import { Flag } from 'lucide-react';

export const metadata = {
  title: 'Жалобы на сообщения в чатах туров — Админ',
  description: 'Сообщения комнат туров, на которые поступили жалобы',
};

function unwrapRelation<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

function profileLabel(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null, fallback: string) {
  if (!p) return fallback;
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || p.email || fallback;
}

export default async function TourRoomReportsPage() {
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  const role = (profile as { role?: string } | null)?.role ?? 'user';
  if (!['super_admin', 'support_admin', 'tour_admin'].includes(role)) {
    redirect('/admin');
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
    console.error('[tour-room-reports]', error);
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
    author?:
      | {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          role?: string | null;
          is_banned?: boolean | null;
        }
      | unknown;
    room?: { tour?: { title?: string | null } | { title?: string | null }[] } | { tour?: { title?: string | null } | { title?: string | null }[] }[] | null;
  };

  const list = (rawMessages || []) as RawMsg[];
  const reporterIds = [...new Set(list.map((m) => m.reported_by).filter((id): id is string => Boolean(id)))];

  const reporterMap = new Map<string, string>();
  type ReporterRow = { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; role?: string | null };
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
    const tourTitle = tour && typeof tour === 'object' && 'title' in tour && typeof tour.title === 'string' ? tour.title : 'Тур';

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

  return (
    <div>
      <div className="mb-8 py-2">
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5">
          <Flag className="h-4 w-4 text-amber-700" aria-hidden />
          <span className="text-sm font-bold text-amber-900">Модерация чатов</span>
        </div>
        <h1 className="mb-2 flex flex-wrap items-center gap-3 text-3xl font-black text-gray-900 md:text-4xl">
          <Flag className="h-8 w-8 text-amber-600" aria-hidden />
          Жалобы на сообщения
        </h1>
        <p className="max-w-3xl text-lg font-bold text-gray-700">
          Сообщения в комнатах туров, помеченные пользователями. Откройте комнату, чтобы удалить сообщение или разобраться в
          контексте.
        </p>
        <p className="mt-3 text-sm font-semibold text-gray-500">
          Загружено с сервера: <span className="tabular-nums text-gray-800">{rows.length}</span>
          {error ? (
            <span className="ml-2 text-rose-600">
              (ошибка загрузки — показано пусто; см. лог сервера)
            </span>
          ) : null}
          {!error && rows.length >= 200 ? (
            <span className="ml-2 text-amber-700">(лимит 200 — самые свежие жалобы)</span>
          ) : null}
        </p>
      </div>

      <TourRoomMessageReportsPanel rows={rows} viewerRole={role} />

      <div className="mt-8 text-center">
        <Link href="/admin/tour-rooms" className="text-sm font-bold text-emerald-600 underline hover:text-emerald-700">
          ← Комнаты туров
        </Link>
      </div>
    </div>
  );
}
