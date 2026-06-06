import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import GuideReportsLive from '@/components/admin/GuideReportsLive';
import { GUIDE_REPORTS_DB_SELECT, mapGuideReportRow } from '@/lib/guide-reports/map-row';
import { Flag } from 'lucide-react';

export const metadata = {
  title: 'Жалобы на гидов — Админ',
  description: 'Жалобы участников на гидов в комнатах туров',
};

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
    .select(GUIDE_REPORTS_DB_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (raw || []).map((r) => mapGuideReportRow(r as Record<string, unknown>));

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
          Участники комнат туров могут пожаловаться на поведение гида. Отметьте статус жалобы или заблокируйте гида при
          необходимости.
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

      <GuideReportsLive initialRows={rows} viewerRole={role} />

      <div className="mt-8 text-center">
        <Link href="/admin/tour-room-reports" className="text-sm font-bold text-emerald-600 underline hover:text-emerald-700">
          ← Жалобы на сообщения в чатах
        </Link>
      </div>
    </div>
  );
}
