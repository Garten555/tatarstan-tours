'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import TourRoomMessageReportsList, { type TourRoomReportRow } from '@/components/admin/TourRoomMessageReportsList';

type ReasonFilter = 'all' | 'with' | 'without';
type SortKey = 'reported_desc' | 'reported_asc' | 'message_desc';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
}

/** Поле type="date" даёт YYYY-MM-DD */
function parseDayStart(iso: string): number | null {
  const t = iso.trim();
  if (!t) return null;
  const d = new Date(`${t}T00:00:00`);
  const ts = d.getTime();
  if (Number.isNaN(ts)) return null;
  return startOfDay(d);
}

function parseDayEnd(iso: string): number | null {
  const t = iso.trim();
  if (!t) return null;
  const d = new Date(`${t}T00:00:00`);
  const ts = d.getTime();
  if (Number.isNaN(ts)) return null;
  return endOfDay(d);
}

function reportTimestamp(row: TourRoomReportRow): number {
  if (row.reported_at) return new Date(row.reported_at).getTime();
  return new Date(row.created_at).getTime();
}

export default function TourRoomMessageReportsPanel({
  rows,
  viewerRole,
}: {
  rows: TourRoomReportRow[];
  viewerRole: string;
}) {
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [reportedFrom, setReportedFrom] = useState('');
  const [reportedTo, setReportedTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('reported_desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = parseDayStart(reportedFrom);
    const toTs = parseDayEnd(reportedTo);

    let out = rows.filter((row) => {
      if (reasonFilter === 'with' && !(row.report_reason && row.report_reason.trim())) return false;
      if (reasonFilter === 'without' && row.report_reason && row.report_reason.trim()) return false;

      const rt = reportTimestamp(row);
      if (fromTs !== null && rt < fromTs) return false;
      if (toTs !== null && rt > toTs) return false;

      if (!q) return true;
      const blob = [
        row.tour_title,
        row.author_label,
        row.author_role ?? '',
        row.reporter_label,
        row.reporter_role ?? '',
        row.message ?? '',
        row.report_reason ?? '',
        row.room_id,
        row.id,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });

    out = [...out].sort((a, b) => {
      if (sortKey === 'reported_desc' || sortKey === 'reported_asc') {
        const ta = reportTimestamp(a);
        const tb = reportTimestamp(b);
        return sortKey === 'reported_desc' ? tb - ta : ta - tb;
      }
      const ma = new Date(a.created_at).getTime();
      const mb = new Date(b.created_at).getTime();
      return mb - ma;
    });

    return out;
  }, [rows, search, reasonFilter, reportedFrom, reportedTo, sortKey]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    reasonFilter !== 'all' ||
    Boolean(reportedFrom.trim()) ||
    Boolean(reportedTo.trim()) ||
    sortKey !== 'reported_desc';

  const resetFilters = () => {
    setSearch('');
    setReasonFilter('all');
    setReportedFrom('');
    setReportedTo('');
    setSortKey('reported_desc');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-emerald-600" aria-hidden />
            <h2 className="text-lg font-black text-gray-900">Фильтры</h2>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              Сбросить всё
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="relative lg:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск: тур, автор, жалобщик, текст, причина, id комнаты…"
              className="w-full rounded-xl border-2 border-gray-200 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Причина жалобы</span>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            >
              <option value="all">Любые</option>
              <option value="with">С указанной причиной</option>
              <option value="without">Без текста причины</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Сортировка</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            >
              <option value="reported_desc">Жалоба: сначала новые</option>
              <option value="reported_asc">Жалоба: сначала старые</option>
              <option value="message_desc">Сообщение: сначала новые</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Жалоба не раньше</span>
            <input
              type="date"
              value={reportedFrom}
              onChange={(e) => setReportedFrom(e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Жалоба не позже</span>
            <input
              type="date"
              value={reportedTo}
              onChange={(e) => setReportedTo(e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            />
          </label>
        </div>

        {rows.length > 0 && (
          <p className="mt-4 text-sm font-semibold text-gray-600">
            Показано:{' '}
            <span className="tabular-nums font-black text-gray-900">{filtered.length}</span>
            {hasActiveFilters ? (
              <>
                {' '}
                из <span className="tabular-nums text-gray-900">{rows.length}</span>
              </>
            ) : null}
          </p>
        )}
      </div>

      <TourRoomMessageReportsList
        rows={filtered}
        viewerRole={viewerRole}
        filteredEmpty={filtered.length === 0 && rows.length > 0}
        onResetFilters={resetFilters}
      />
    </div>
  );
}
