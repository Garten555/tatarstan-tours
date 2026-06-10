import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import TourRoomMessageReportsLive from '@/components/admin/TourRoomMessageReportsLive';
import { fetchTourRoomMessageReports } from '@/lib/tour-room-reports/fetch-reports';
import { Flag } from 'lucide-react';

export const metadata = {
  title: 'Жалобы на сообщения в чатах туров — Админ',
  description: 'Сообщения комнат туров, на которые поступили жалобы',
};

export default async function TourRoomReportsPage() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

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

  const { rows, error, setupHint } = await fetchTourRoomMessageReports(serviceClient);

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
            <span className="ml-2 text-rose-600">({error})</span>
          ) : null}
          {!error && rows.length >= 200 ? (
            <span className="ml-2 text-amber-700">(лимит 200 — самые свежие жалобы)</span>
          ) : null}
        </p>
        {setupHint && rows.length === 0 ? (
          <div className="mt-4 max-w-3xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            Таблица жалоб в базе не создана. В Supabase → SQL Editor выполните файл{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-xs">{setupHint}</code>, затем обновите эту страницу.
          </div>
        ) : null}
      </div>

      <TourRoomMessageReportsLive
        initialRows={rows}
        viewerRole={role}
        initialError={error}
        initialSetupHint={setupHint}
      />

      <div className="mt-8 text-center">
        <Link href="/admin/tour-rooms" className="text-sm font-bold text-emerald-600 underline hover:text-emerald-700">
          ← Комнаты туров
        </Link>
      </div>
    </div>
  );
}
