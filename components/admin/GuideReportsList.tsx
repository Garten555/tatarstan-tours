'use client';

import Link from 'next/link';
import { Flag, ExternalLink, Calendar, Shield } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import BanUserButton from '@/components/admin/BanUserButton';

export type GuideReportRow = {
  id: string;
  room_id: string | null;
  created_at: string;
  reason: string | null;
  status: string;
  guide_label: string;
  guide_user_id: string;
  guide_role: string | null;
  guide_is_banned: boolean;
  reporter_label: string;
  reporter_role: string | null;
};

function roleRu(role: string | null | undefined): string {
  if (!role) return '';
  const m: Record<string, string> = {
    super_admin: 'Суперадмин',
    tour_admin: 'Админ туров',
    support_admin: 'Модератор',
    guide: 'Гид',
    user: 'Участник',
  };
  return m[role] || role;
}

function canBanGuide(row: GuideReportRow, viewerRole: string): boolean {
  if (!row.guide_user_id) return false;
  if (!['super_admin', 'tour_admin', 'support_admin'].includes(viewerRole)) return false;
  if (row.guide_role === 'super_admin') return false;
  if (viewerRole === 'support_admin' && row.guide_role && ['tour_admin', 'support_admin'].includes(row.guide_role)) {
    return false;
  }
  return true;
}

export default function GuideReportsList({ rows, viewerRole }: { rows: GuideReportRow[]; viewerRole: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-white p-12 text-center shadow-sm">
        <Flag className="mx-auto mb-4 h-14 w-14 text-violet-300" aria-hidden />
        <p className="text-xl font-black text-gray-900">Жалоб на гидов пока нет</p>
        <p className="mt-2 font-semibold text-gray-600">Участники могут отправить жалобу из комнаты тура (кнопка у шапки чата).</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article
          key={row.id}
          className="overflow-hidden rounded-2xl border-2 border-violet-200/80 bg-white shadow-sm transition hover:border-violet-400 hover:shadow-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50/90 to-indigo-50/50 px-5 py-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">
                <Flag className="h-3.5 w-3.5" aria-hidden />
                Жалоба на гида
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-violet-900/80">{row.status}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canBanGuide(row, viewerRole) ? (
                <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <BanUserButton
                    userId={row.guide_user_id}
                    isBanned={row.guide_is_banned}
                    userRole={row.guide_role ?? undefined}
                  />
                </div>
              ) : row.guide_role === 'super_admin' ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-900">
                  <Shield className="h-4 w-4 shrink-0" aria-hidden />
                  Суперадмина нельзя забанить
                </span>
              ) : viewerRole === 'support_admin' &&
                row.guide_role &&
                ['tour_admin', 'support_admin'].includes(row.guide_role) ? (
                <span className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">
                  Бан гида только у админа туров / суперадмина
                </span>
              ) : null}
              {row.room_id ? (
                <Link
                  href={`/tour-rooms/${row.room_id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Открыть комнату
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-gray-600">
                <span>
                  <span className="text-gray-500">Гид:</span>{' '}
                  <span className="text-gray-900">{escapeHtml(row.guide_label)}</span>
                  {row.guide_role ? (
                    <span className="ml-2 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-900">
                      {roleRu(row.guide_role)}
                    </span>
                  ) : null}
                </span>
                <span>
                  <span className="text-gray-500">Пожаловался:</span>{' '}
                  <span className="text-gray-900">{escapeHtml(row.reporter_label)}</span>
                  {row.reporter_role ? (
                    <span className="ml-2 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                      {roleRu(row.reporter_role)}
                    </span>
                  ) : null}
                </span>
              </div>
              {row.reason ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm">
                  <span className="font-black text-rose-900">Текст: </span>
                  <span className="font-semibold text-rose-950">{escapeHtml(row.reason)}</span>
                </div>
              ) : (
                <p className="text-sm font-semibold italic text-gray-500">Текст жалобы не указан</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1 text-xs font-semibold text-gray-500 sm:text-right">
              <span className="inline-flex items-center justify-end gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                {new Date(row.created_at).toLocaleString('ru-RU')}
              </span>
              <span className="font-mono text-[11px] text-gray-400">id: {row.id}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
