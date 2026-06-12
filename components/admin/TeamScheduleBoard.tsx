'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Map as MapIcon,
  User,
} from 'lucide-react';
import { formatDayMonthYearRu, formatTimeRu } from '@/lib/date/format-ru';
import { moscowNowParts } from '@/lib/tour/moscow-wall-clock';
import { currentMoscowDay, moscowDayKey, shiftMoscowMonth } from '@/lib/tour/team-schedule-range';

type ScheduleSession = {
  id: string;
  start_at: string;
  end_at: string | null;
  status: string;
  guide_id: string | null;
  guide_name: string;
  tour: {
    id: string;
    title: string;
    slug: string;
    cover_image: string | null;
  };
  room_id: string | null;
  has_conflict: boolean;
};

type CalendarCell = {
  key: string;
  day: number;
  weekday: number;
  in_month: boolean;
};

type DayMarker = {
  count: number;
  covers: string[];
  has_conflict: boolean;
};

type ScheduleResponse = {
  month: string;
  today: string;
  calendar_cells: CalendarCell[];
  day_markers: Record<string, DayMarker>;
  sessions: ScheduleSession[];
  guides: Array<{ id: string; name: string }>;
  viewer: { role: string; user_id: string };
};

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const STATUS_LABEL: Record<string, string> = {
  active: 'Активен',
  draft: 'Черновик',
  completed: 'Завершён',
};

function sessionMoscowDayKey(startAt: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startAt));
}

function monthTitle(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function tourCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} тур`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} тура`;
  return `${count} туров`;
}

function weekdayLabelForDayKey(dayKey: string): string {
  const noon = `${dayKey}T12:00:00.000Z`;
  const d = new Date(noon);
  const weekday = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    weekday: 'long',
  }).format(d);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

interface TeamScheduleBoardProps {
  initialMonth: string;
  initialSelectedDay: string;
  viewerRole: string;
}

export default function TeamScheduleBoard({
  initialMonth,
  initialSelectedDay,
  viewerRole,
}: TeamScheduleBoardProps) {
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialSelectedDay);
  const [guideFilter, setGuideFilter] = useState('all');
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = viewerRole === 'tour_admin' || viewerRole === 'super_admin';
  const todayKey = useMemo(() => {
    const now = moscowNowParts();
    return moscowDayKey(now.year, now.month, now.day);
  }, []);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ month: viewMonth });
      if (isAdmin && guideFilter !== 'all') {
        params.set('guide_id', guideFilter);
      }
      const res = await fetch(`/api/admin/team-schedule?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Не удалось загрузить расписание');
      }
      setData(json as ScheduleResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [viewMonth, guideFilter, isAdmin]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, ScheduleSession[]>();
    for (const session of data?.sessions ?? []) {
      const key = sessionMoscowDayKey(session.start_at);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [data?.sessions]);

  const selectedSessions = sessionsByDay.get(selectedDay) ?? [];
  const selectedMarker = data?.day_markers[selectedDay];
  const conflictCount = (data?.sessions ?? []).filter((s) => s.has_conflict).length;
  const totalSessions = data?.sessions.length ?? 0;

  const goMonth = (delta: number) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const next = shiftMoscowMonth(y, m, delta);
    setViewMonth(next.key);
  };

  const goToday = () => {
    const today = currentMoscowDay();
    setViewMonth(`${today.year}-${String(today.month).padStart(2, '0')}`);
    setSelectedDay(today.key);
  };

  const handleMonthPicker = (value: string) => {
    if (!value) return;
    setViewMonth(value);
    const [y, m] = value.split('-').map(Number);
    const dayPart = selectedDay.split('-')[2];
    const maxDay = new Date(y, m, 0).getDate();
    const day = Math.min(Number(dayPart) || 1, maxDay);
    setSelectedDay(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900 md:text-3xl">
            <CalendarDays className="h-8 w-8 text-emerald-600" />
            Расписание
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-600 md:text-base">
            {isAdmin
              ? 'Календарь месяца с обложками туров и занятостью гидов'
              : 'Ваши выезды — выберите день в календаре'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <input
            type="month"
            value={viewMonth}
            onChange={(e) => handleMonthPicker(e.target.value)}
            className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 shadow-sm focus:border-emerald-400 focus:outline-none"
            aria-label="Выбор месяца"
          />

          <button
            type="button"
            onClick={() => goMonth(1)}
            className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Сегодня
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-lg md:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Месяц</p>
          <p className="text-lg font-black text-gray-900">{monthTitle(viewMonth)}</p>
          <p className="mt-1 text-sm text-gray-600">
            Выездов в месяце: <span className="font-bold text-gray-900">{totalSessions}</span>
            {conflictCount > 0 && (
              <span className="ml-2 font-bold text-red-600">· пересечений: {conflictCount}</span>
            )}
          </p>
        </div>

        {isAdmin && (
          <label className="flex w-full flex-col gap-1 lg:max-w-xs">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Гид</span>
            <select
              value={guideFilter}
              onChange={(e) => setGuideFilter(e.target.value)}
              className="rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-emerald-400 focus:outline-none"
            >
              <option value="all">Все гиды</option>
              <option value="unassigned">Без гида</option>
              {(data?.guides ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Месячный календарь */}
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-lg md:p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-gray-700">
            {monthTitle(viewMonth)}
          </h2>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {WEEKDAY_SHORT.map((name) => (
              <div
                key={name}
                className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400"
              >
                {name}
              </div>
            ))}
          </div>

          {loading && !data ? (
            <div className="py-16 text-center text-sm text-gray-500">Загрузка календаря…</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {(data?.calendar_cells ?? []).map((cell) => {
                const marker = data?.day_markers[cell.key];
                const isSelected = cell.key === selectedDay;
                const isToday = cell.key === todayKey;
                const hasTours = (marker?.count ?? 0) > 0;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => {
                      setSelectedDay(cell.key);
                      if (!cell.in_month) {
                        const [y, m] = cell.key.split('-');
                        setViewMonth(`${y}-${m}`);
                      }
                    }}
                    className={`relative flex min-h-[4.5rem] flex-col rounded-xl border-2 p-1.5 text-left transition-all sm:min-h-[5.25rem] ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                        : hasTours
                          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                          : 'border-transparent bg-gray-50/80 hover:border-gray-200 hover:bg-white'
                    } ${!cell.in_month ? 'opacity-45' : ''}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                        isToday
                          ? 'bg-emerald-600 text-white'
                          : isSelected
                            ? 'text-emerald-800'
                            : 'text-gray-800'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {hasTours && (
                      <div className="mt-1 flex flex-1 flex-col justify-end gap-1">
                        {marker?.covers && marker.covers.length > 0 ? (
                          <div className="flex -space-x-1.5">
                            {marker.covers.slice(0, 3).map((cover, i) => (
                              <img
                                key={`${cell.key}-${i}`}
                                src={cover}
                                alt=""
                                className="h-6 w-6 rounded-md border-2 border-white object-cover shadow-sm sm:h-7 sm:w-7"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        )}
                        <span
                          className={`text-[10px] font-bold leading-none ${
                            marker?.has_conflict ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {tourCountLabel(marker?.count ?? 0)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-semibold text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Есть выезды
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-md bg-gray-200" />
              Миниатюра тура
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              Пересечение по времени
            </span>
          </div>
        </div>

        {/* Детали выбранного дня */}
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-lg md:p-5">
          <div className="mb-4 border-b border-gray-100 pb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Выбранный день</p>
            <p className="text-xl font-black text-gray-900">
              {formatDayMonthYearRu(`${selectedDay}T12:00:00.000Z`)}
            </p>
            <p className="text-sm font-medium text-gray-600">{weekdayLabelForDayKey(selectedDay)}</p>
            <p className="mt-1 text-sm text-gray-600">
              {selectedSessions.length === 0
                ? 'Нет выездов'
                : selectedMarker?.has_conflict
                  ? `${tourCountLabel(selectedSessions.length)} · есть пересечения`
                  : tourCountLabel(selectedSessions.length)}
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Загрузка…</div>
          ) : selectedSessions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">В этот день туров нет</p>
              <p className="mt-1 text-xs text-gray-400">Выберите другой день в календаре слева</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {selectedSessions.map((session) => (
                <li
                  key={session.id}
                  className={`overflow-hidden rounded-2xl border-2 shadow-sm ${
                    session.has_conflict
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex gap-0 sm:gap-0">
                    {session.tour.cover_image ? (
                      <div className="relative w-24 shrink-0 sm:w-32">
                        <img
                          src={session.tour.cover_image}
                          alt=""
                          className="h-full min-h-[6.5rem] w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex w-24 shrink-0 items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 sm:w-32">
                        <MapIcon className="h-8 w-8 text-emerald-600/60" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 p-3 sm:p-4">
                      <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                        <Clock className="h-4 w-4 shrink-0" />
                        {formatTimeRu(session.start_at)}
                        {session.end_at && (
                          <>
                            <span className="font-normal text-gray-400">—</span>
                            {formatTimeRu(session.end_at)}
                          </>
                        )}
                      </div>

                      <h3 className="mb-1 line-clamp-2 text-base font-black leading-snug text-gray-900">
                        {session.tour.title}
                      </h3>

                      {isAdmin && (
                        <p className="mb-2 flex items-center gap-1 text-sm text-gray-600">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          {session.guide_name}
                        </p>
                      )}

                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        {STATUS_LABEL[session.status] ?? session.status}
                      </p>

                      {session.has_conflict && (
                        <p className="mb-2 flex items-center gap-1 text-xs font-bold text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Пересечение по времени у гида
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {isAdmin && (
                          <Link
                            href={`/admin/tours/${session.tour.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                          >
                            <MapIcon className="h-3.5 w-3.5" />
                            Тур
                          </Link>
                        )}
                        {session.room_id && (
                          <Link
                            href={`/tour-rooms/${session.room_id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800 ring-1 ring-blue-200 hover:bg-blue-100"
                          >
                            <DoorOpen className="h-3.5 w-3.5" />
                            Комната
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
