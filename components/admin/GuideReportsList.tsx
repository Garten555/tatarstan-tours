'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Flag, ExternalLink, Calendar, Shield, Loader2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';
import FormattedDate from '@/components/common/FormattedDate';
import BanUserButton, { type BanProfileUpdate } from '@/components/admin/BanUserButton';
import ModerationUserChip from '@/components/admin/ModerationUserChip';
import { canBanUserAsAdmin } from '@/lib/admin/can-ban-user';
import {
  type GuideReportStatus,
  guideReportStatusBadgeClass,
  guideReportStatusLabel,
  isGuideReportStatus,
} from '@/lib/guide-reports/status';

export type GuideReportRow = {
  id: string;
  room_id: string | null;
  created_at: string;
  reason: string | null;
  status: string;
  guide_label: string;
  guide_user_id: string;
  guide_email: string | null;
  guide_avatar_url: string | null;
  guide_role: string | null;
  guide_is_banned: boolean;
  reporter_user_id: string | null;
  reporter_label: string;
  reporter_email: string | null;
  reporter_avatar_url: string | null;
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

type StatusAction = {
  status: GuideReportStatus;
  label: string;
  icon: typeof CheckCircle2;
  className: string;
};

function statusActions(current: string): StatusAction[] {
  const st = isGuideReportStatus(current) ? current : 'open';
  if (st === 'open') {
    return [
      { status: 'reviewed', label: 'На рассмотрении', icon: Flag, className: 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100' },
      { status: 'resolved', label: 'Решена', icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' },
      { status: 'dismissed', label: 'Отклонить', icon: XCircle, className: 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100' },
    ];
  }
  if (st === 'reviewed') {
    return [
      { status: 'resolved', label: 'Решена', icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' },
      { status: 'dismissed', label: 'Отклонить', icon: XCircle, className: 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100' },
      { status: 'open', label: 'Снова открыть', icon: RotateCcw, className: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100' },
    ];
  }
  return [
    { status: 'open', label: 'Снова открыть', icon: RotateCcw, className: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100' },
  ];
}

type Props = {
  rows: GuideReportRow[];
  viewerRole: string;
  onGuideBanChange?: (guideUserId: string, profile: BanProfileUpdate) => void;
  onStatusChange?: (reportId: string, status: string) => void;
  filteredEmpty?: boolean;
  onResetFilters?: () => void;
};

export default function GuideReportsList({
  rows,
  viewerRole,
  onGuideBanChange,
  onStatusChange,
  filteredEmpty = false,
  onResetFilters,
}: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleBanChange = (guideUserId: string) => (profile: BanProfileUpdate) => {
    onGuideBanChange?.(guideUserId, profile);
  };

  const handleStatus = async (reportId: string, status: GuideReportStatus) => {
    setUpdatingId(reportId);
    try {
      const res = await fetch(`/api/admin/guide-reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось обновить статус');
      onStatusChange?.(reportId, status);
      toast.success(`Статус: ${guideReportStatusLabel(status)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка обновления статуса');
    } finally {
      setUpdatingId(null);
    }
  };

  if (rows.length === 0 && filteredEmpty) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-white p-12 text-center shadow-sm">
        <Flag className="mx-auto mb-4 h-14 w-14 text-violet-300" aria-hidden />
        <p className="text-xl font-black text-gray-900">Ничего не найдено</p>
        <p className="mt-2 font-semibold text-gray-600">Сбросьте или измените фильтры.</p>
        {onResetFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>
    );
  }

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
      {rows.map((row) => {
        const actions = statusActions(row.status);
        const isUpdating = updatingId === row.id;

        return (
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
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${guideReportStatusBadgeClass(row.status)}`}
                >
                  {guideReportStatusLabel(row.status)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canBanUserAsAdmin(viewerRole, row.guide_user_id, row.guide_role, '') ? (
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <BanUserButton
                      userId={row.guide_user_id}
                      isBanned={row.guide_is_banned}
                      userRole={row.guide_role ?? undefined}
                      onBanChange={handleBanChange(row.guide_user_id)}
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
              <div className="min-w-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Гид</p>
                    <ModerationUserChip
                      name={row.guide_label}
                      email={row.guide_email}
                      avatarUrl={row.guide_avatar_url}
                      badge={row.guide_role ? roleRu(row.guide_role) : null}
                      badgeClassName="bg-emerald-100 text-emerald-900"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Пожаловался</p>
                    <ModerationUserChip
                      name={row.reporter_label}
                      email={row.reporter_email}
                      avatarUrl={row.reporter_avatar_url}
                      badge={row.reporter_role ? roleRu(row.reporter_role) : null}
                    />
                  </div>
                </div>

                {row.reason ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm">
                    <span className="font-black text-rose-900">Текст: </span>
                    <span className="font-semibold text-rose-950">{escapeHtml(row.reason)}</span>
                  </div>
                ) : (
                  <p className="text-sm font-semibold italic text-gray-500">Текст жалобы не указан</p>
                )}

                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                  <span className="w-full text-xs font-bold uppercase tracking-wide text-gray-500">Действия по жалобе</span>
                  {isUpdating ? (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-800">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Сохранение…
                    </span>
                  ) : (
                    actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.status}
                          type="button"
                          disabled={row.status === action.status}
                          onClick={() => void handleStatus(row.id, action.status)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          {action.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 text-xs font-semibold text-gray-500 sm:text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  <FormattedDate value={row.created_at} />
                </span>
                <span className="font-mono text-[11px] text-gray-400">id: {row.id}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
