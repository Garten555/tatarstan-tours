import Link from 'next/link';
import { Flag, ExternalLink, Calendar } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';

export type TourRoomReportRow = {
  id: string;
  room_id: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
  reported_at: string | null;
  report_reason: string | null;
  author_label: string;
  reporter_label: string;
  tour_title: string;
};

type ListProps = {
  rows: TourRoomReportRow[];
  /** После фильтрации список пуст, но записи на сервере были */
  filteredEmpty?: boolean;
  onResetFilters?: () => void;
};

export default function TourRoomMessageReportsList({
  rows,
  filteredEmpty = false,
  onResetFilters,
}: ListProps) {
  if (rows.length === 0 && filteredEmpty) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-12 text-center shadow-sm">
        <Flag className="mx-auto mb-4 h-14 w-14 text-amber-300" aria-hidden />
        <p className="text-xl font-black text-gray-900">Нет записей по фильтрам</p>
        <p className="mt-2 font-semibold text-gray-600">Измените условия или сбросьте фильтры.</p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-md transition hover:bg-emerald-700"
          >
            Сбросить фильтры
          </button>
        )}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
        <Flag className="mx-auto mb-4 h-14 w-14 text-gray-300" aria-hidden />
        <p className="text-xl font-black text-gray-900">Нет сообщений с жалобами</p>
        <p className="mt-2 font-semibold text-gray-600">
          Когда пользователи пожалуются на сообщение в чате тура, оно появится здесь.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article
          key={row.id}
          className="overflow-hidden rounded-2xl border-2 border-amber-200/80 bg-white shadow-sm transition hover:border-amber-400 hover:shadow-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50/90 to-orange-50/50 px-5 py-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-white">
                <Flag className="h-3.5 w-3.5" aria-hidden />
                Жалоба
              </span>
              <span className="truncate text-base font-black text-gray-900">{escapeHtml(row.tour_title)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/tour-rooms/${row.room_id}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Открыть комнату
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/admin/tour-rooms"
                className="rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 transition hover:border-emerald-300 hover:bg-emerald-50/50"
              >
                Все комнаты
              </Link>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold text-gray-600">
                <span>
                  <span className="text-gray-500">Автор:</span>{' '}
                  <span className="text-gray-900">{escapeHtml(row.author_label)}</span>
                </span>
                <span>
                  <span className="text-gray-500">Пожаловался:</span>{' '}
                  <span className="text-gray-900">{escapeHtml(row.reporter_label)}</span>
                </span>
              </div>
              {row.report_reason ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm">
                  <span className="font-black text-rose-900">Причина: </span>
                  <span className="font-semibold text-rose-950">{escapeHtml(row.report_reason)}</span>
                </div>
              ) : (
                <p className="text-sm font-semibold italic text-gray-500">Причина не указана</p>
              )}
              {row.message ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-gray-900">
                    {escapeHtml(row.message)}
                  </p>
                </div>
              ) : null}
              {row.image_url ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.image_url} alt="" className="max-h-64 w-full object-contain" loading="lazy" />
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col gap-1 text-xs font-semibold text-gray-500 sm:text-right">
              <span className="inline-flex items-center justify-end gap-1 sm:justify-end">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                Сообщение: {new Date(row.created_at).toLocaleString('ru-RU')}
              </span>
              {row.reported_at ? (
                <span className="text-amber-800">
                  Жалоба: {new Date(row.reported_at).toLocaleString('ru-RU')}
                </span>
              ) : null}
              <span className="font-mono text-[11px] text-gray-400">id: {row.id}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
