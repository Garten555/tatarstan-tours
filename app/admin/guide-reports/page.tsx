import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import GuideReportsList, { type GuideReportRow } from '@/components/admin/GuideReportsList';
import { Flag } from 'lucide-react';

export const metadata = {
  title: 'Жалобы на гидов — Админ',
  description: 'Жалобы участников на гидов в комнатах туров',
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

export default async function GuideReportsPage() {
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

  const { data: raw, error } = await serviceClient
    .from('guide_reports')
    .select(
      `
      id,
      room_id,
      reason,
      status,
      created_at,
      guide:profiles!guide_reports_guide_id_fkey(id, first_name, last_name, email, role, is_banned),
      reporter:profiles!guide_reports_reporter_id_fkey(id, first_name, last_name, email, role)
    `
    )
    .order('created_at', { ascending: false })
    .limit(200);

  const rows: GuideReportRow[] = (raw || []).map((r: Record<string, unknown>) => {
    const g = unwrapRelation(r.guide as object) as {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      role?: string | null;
      is_banned?: boolean | null;
    } | null;
    const rep = unwrapRelation(r.reporter as object) as {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      role?: string | null;
    } | null;

    return {
      id: String(r.id),
      room_id: r.room_id ? String(r.room_id) : null,
      created_at: String(r.created_at),
      reason: r.reason ? String(r.reason) : null,
      status: String(r.status ?? 'open'),
      guide_user_id: g?.id || '',
      guide_label: profileLabel(g, 'Гид'),
      guide_role: g?.role ?? null,
      guide_is_banned: Boolean(g?.is_banned),
      reporter_label: profileLabel(rep, 'Участник'),
      reporter_role: rep?.role ?? null,
    };
  });

  return (
    <div>
      <div className="mb-8 py-2">
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5">
          <Flag className="h-4 w-4 text-violet-700" aria-hidden />
          <span className="text-sm font-bold text-violet-900">Модерация гидов</span>
        </div>
        <h1 className="mb-2 flex flex-wrap items-center gap-3 text-3xl font-black text-gray-900 md:text-4xl">
          <Flag className="h-8 w-8 text-violet-600" aria-hidden />
          Жалобы на гидов
        </h1>
        <p className="max-w-3xl text-lg font-bold text-gray-700">
          Участники комнат туров могут пожаловаться на поведение гида. Здесь же можно заблокировать гида при необходимости (с
          учётом прав вашей роли).
        </p>
        <p className="mt-3 text-sm font-semibold text-gray-500">
          Загружено: <span className="tabular-nums text-gray-800">{rows.length}</span>
          {error ? (
            <span className="ml-2 text-rose-600">
              (ошибка: примените миграцию <code className="rounded bg-gray-100 px-1">008_guide_reports.sql</code> в Supabase)
            </span>
          ) : null}
        </p>
      </div>

      <GuideReportsList rows={rows} viewerRole={role} />

      <div className="mt-8 text-center">
        <Link href="/admin/tour-room-reports" className="text-sm font-bold text-emerald-600 underline hover:text-emerald-700">
          ← Жалобы на сообщения в чатах
        </Link>
      </div>
    </div>
  );
}
