'use client';

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import GuideReportsList, { type GuideReportRow } from '@/components/admin/GuideReportsList';
import type { BanProfileUpdate } from '@/components/admin/BanUserButton';

type ReasonFilter = 'all' | 'with' | 'without';
type StatusFilter = 'all' | 'open' | 'closed';
type BanFilter = 'all' | 'banned' | 'active';
type SortKey = 'created_desc' | 'created_asc';

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

type Props = {
  rows: GuideReportRow[];
  viewerRole: string;
  onGuideBanChange?: (guideUserId: string, profile: BanProfileUpdate) => void;
};

export default function GuideReportsPanel({ rows, viewerRole, onGuideBanChange }: Props) {
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [banFilter, setBanFilter] = useState<BanFilter>('all');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = parseDayStart(createdFrom);
    const toTs = parseDayEnd(createdTo);

    let out = rows.filter((row) => {
      if (reasonFilter === 'with' && !(row.reason && row.reason.trim())) return false;
      if (reasonFilter === 'without' && row.reason && row.reason.trim()) return false;

      const st = (row.status || '').toLowerCase();
      if (statusFilter === 'open' && st !== 'open') return false;
      if (statusFilter === 'closed' && st === 'open') return false;

      if (banFilter === 'banned' && !row.guide_is_banned) return false;
      if (banFilter === 'active' && row.guide_is_banned) return false;

      const ct = new Date(row.created_at).getTime();
      if (fromTs !== null && ct < fromTs) return false;
      if (toTs !== null && ct > toTs) return false;

      if (!q) return true;
      const blob = [
        row.guide_label,
        row.guide_role ?? '',
        row.reporter_label,
        row.reporter_role ?? '',
        row.reason ?? '',
        row.status,
        row.room_id ?? '',
        row.id,
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });

    out = [...out].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortKey === 'created_desc' ? tb - ta : ta - tb;
    });

    return out;
  }, [rows, search, reasonFilter, statusFilter, banFilter, createdFrom, createdTo, sortKey]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    reasonFilter !== 'all' ||
    statusFilter !== 'all' ||
    banFilter !== 'all' ||
    Boolean(createdFrom.trim()) ||
    Boolean(createdTo.trim()) ||
    sortKey !== 'created_desc';

  const resetFilters = () => {
    setSearch('');
    setReasonFilter('all');
    setStatusFilter('all');
    setBanFilter('all');
    setCreatedFrom('');
    setCreatedTo('');
    setSortKey('created_desc');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-violet-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-violet-600" aria-hidden />
            <h2 className="text-lg font-black text-gray-900">Фильтры</h2>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-bold text-violet-600 hover:text-violet-700"
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
              placeholder="Поиск: гид, жалобщик, текст, статус, id комнаты…"
              className="w-full rounded-xl border-2 border-gray-200 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Статус жалобы</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            >
              <option value="all">Любой</option>
              <option value="open">Открыта (open)</option>
              <option value="closed">Закрыта / иное</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Гид</span>
            <select
              value={banFilter}
              onChange={(e) => setBanFilter(e.target.value as BanFilter)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            >
              <option value="all">Все</option>
              <option value="active">Не заблокирован</option>
              <option value="banned">Заблокирован</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Текст жалобы</span>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            >
              <option value="all">Любые</option>
              <option value="with">С текстом</option>
              <option value="without">Без текста</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Сортировка</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            >
              <option value="created_desc">Сначала новые</option>
              <option value="created_asc">Сначала старые</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Жалоба не раньше</span>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-gray-700">Жалоба не позже</span>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
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

      <GuideReportsList
        rows={filtered}
        viewerRole={viewerRole}
        onGuideBanChange={onGuideBanChange}
        filteredEmpty={filtered.length === 0 && rows.length > 0}
        onResetFilters={resetFilters}
      />
    </div>
  );
}
