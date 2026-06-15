'use client';

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { shiftMonthKey, type GuideTourLifecycleFilter } from '@/lib/admin/guide-tour-rooms-filters';

type Accent = 'emerald' | 'amber';

const accentClasses: Record<
  Accent,
  {
    focus: string;
    hoverBorder: string;
    hoverText: string;
    todayActive: string;
    todayIdle: string;
    reset: string;
    paginationHover: string;
    pageActive: string;
  }
> = {
  emerald: {
    focus: 'focus:border-emerald-500 focus:ring-emerald-500/30',
    hoverBorder: 'hover:border-emerald-400',
    hoverText: 'hover:text-emerald-800',
    todayActive: 'border-emerald-500 bg-emerald-500 text-white shadow-md',
    todayIdle: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
    reset: 'text-emerald-600 hover:text-emerald-700',
    paginationHover: 'hover:border-emerald-500',
    pageActive: 'border-emerald-500 bg-emerald-500 text-white',
  },
  amber: {
    focus: 'focus:border-amber-500 focus:ring-amber-500/30',
    hoverBorder: 'hover:border-amber-400',
    hoverText: 'hover:text-amber-800',
    todayActive: 'border-amber-500 bg-amber-500 text-white shadow-md',
    todayIdle: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
    reset: 'text-amber-600 hover:text-amber-700',
    paginationHover: 'hover:border-amber-500',
    pageActive: 'border-amber-500 bg-amber-500 text-white',
  },
};

interface GuideTourRoomsFiltersBarProps {
  accent?: Accent;
  filterSearch: string;
  onFilterSearchChange: (value: string) => void;
  lifecycleFilter: GuideTourLifecycleFilter;
  onLifecycleFilterChange: (value: GuideTourLifecycleFilter) => void;
  monthInputValue: string;
  onMonthChange: (month: string) => void;
  onMonthShift: (delta: -1 | 1) => void;
  onTodayClick: () => void;
  isTodayActive: boolean;
  showClearDates: boolean;
  onClearDates: () => void;
  hasListFilters: boolean;
  onResetFilters: () => void;
  filteredCount: number;
  totalCount: number;
  page: number;
  totalPages: number;
  showPagination: boolean;
  countLabel?: string;
}

export default function GuideTourRoomsFiltersBar({
  accent = 'emerald',
  filterSearch,
  onFilterSearchChange,
  lifecycleFilter,
  onLifecycleFilterChange,
  monthInputValue,
  onMonthChange,
  onMonthShift,
  onTodayClick,
  isTodayActive,
  showClearDates,
  onClearDates,
  hasListFilters,
  onResetFilters,
  filteredCount,
  totalCount,
  page,
  totalPages,
  showPagination,
  countLabel = 'комнат',
}: GuideTourRoomsFiltersBarProps) {
  const a = accentClasses[accent];

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-black text-gray-900">Фильтры</h2>
        {hasListFilters ? (
          <button type="button" onClick={onResetFilters} className={`text-sm font-bold ${a.reset}`}>
            Сбросить
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:flex-wrap">
        <label className="relative min-w-0 flex-1 lg:min-w-[14rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={filterSearch}
            onChange={(e) => onFilterSearchChange(e.target.value)}
            placeholder="Поиск по названию тура или городу…"
            autoComplete="off"
            className={`w-full rounded-xl border-2 border-gray-200 py-3 pl-11 pr-4 text-base outline-none transition focus:ring-2 ${a.focus}`}
          />
        </label>
        <label className="flex w-full flex-col gap-1 text-sm lg:w-48">
          <span className="font-bold text-gray-700">Статус тура</span>
          <select
            value={lifecycleFilter}
            onChange={(e) => onLifecycleFilterChange(e.target.value as GuideTourLifecycleFilter)}
            className={`rounded-xl border-2 border-gray-200 px-4 py-3 text-base font-semibold outline-none transition focus:ring-2 ${a.focus}`}
          >
            <option value="all">Все</option>
            <option value="ongoing">Идёт сейчас</option>
            <option value="upcoming">Предстоят</option>
            <option value="ended">Завершены</option>
          </select>
        </label>
        <div className="flex w-full flex-col gap-1 text-sm lg:w-auto">
          <span className="font-bold text-gray-700">Месяц выезда (МСК)</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onMonthShift(-1)}
              className={`inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-gray-700 shadow-sm transition ${a.hoverBorder} ${a.hoverText}`}
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <input
              type="month"
              value={monthInputValue}
              onChange={(e) => onMonthChange(e.target.value)}
              className={`min-w-[10.5rem] rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-base font-bold text-gray-900 shadow-sm focus:outline-none focus:ring-2 ${a.focus}`}
              aria-label="Месяц тура"
            />
            <button
              type="button"
              onClick={() => onMonthShift(1)}
              className={`inline-flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-gray-700 shadow-sm transition ${a.hoverBorder} ${a.hoverText}`}
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onTodayClick}
              className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                isTodayActive ? a.todayActive : a.todayIdle
              }`}
            >
              Сегодня
            </button>
            {showClearDates ? (
              <button
                type="button"
                onClick={onClearDates}
                className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Все даты
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-600">
        {hasListFilters ? (
          <>
            Найдено: <span className="font-black tabular-nums text-gray-900">{filteredCount}</span>
            {' · '}
          </>
        ) : null}
        {showPagination ? (
          <>
            Страница <span className="font-black tabular-nums text-gray-900">{Math.min(page, totalPages)}</span> /{' '}
            <span className="font-black tabular-nums text-gray-900">{totalPages}</span>
            {' · '}
          </>
        ) : null}
        всего {countLabel}: <span className="font-black tabular-nums text-gray-900">{totalCount}</span>
      </p>
    </div>
  );
}

interface GuideTourRoomsPaginationProps {
  accent?: Accent;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function GuideTourRoomsPagination({
  accent = 'emerald',
  page,
  totalPages,
  onPageChange,
}: GuideTourRoomsPaginationProps) {
  const a = accentClasses[accent];

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className={`flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-2.5 text-base font-bold transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${a.paginationHover}`}
      >
        <ChevronLeft className="h-5 w-5" />
        Назад
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) pageNum = i + 1;
          else if (page <= 3) pageNum = i + 1;
          else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = page - 2 + i;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[2.5rem] rounded-xl border-2 px-3 py-2 text-base font-bold transition-all ${
                page === pageNum
                  ? `${a.pageActive} shadow-md`
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className={`flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-2.5 text-base font-bold transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${a.paginationHover}`}
      >
        Вперёд
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
