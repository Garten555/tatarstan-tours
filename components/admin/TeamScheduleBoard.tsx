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
import { sessionEndMs } from '@/lib/tour/schedule-slot';

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
  schedule_issue: 'overlap' | 'buffer' | null;
  gap_minutes: number | null;
  issue_message: string | null;
};

type CalendarCell = {
  key: string;
  day: number;
  weekday: number;
  in_month: boolean;
};

type DayMarker = {
  count: number;
  has_overlap: boolean;
  has_buffer: boolean;
};

type ScheduleResponse = {
  month: string;
  today: string;
  calendar_cells: CalendarCell[];
  day_markers: Record<string, DayMarker>;
  sessions: ScheduleSession[];
  guides: Array<{ id: string; name: string }>;
  buffer_minutes: number;
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

const TIMELINE_START_MIN = 6 * 60;
const TIMELINE_END_MIN = 23 * 60;
const TIMELINE_SPAN = TIMELINE_END_MIN - TIMELINE_START_MIN;

function sessionMoscowDayKey(startAt: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(startAt));
}

function moscowMinutesSinceMidnight(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
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
  const weekday = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    weekday: 'long',
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function sessionTimelineStyle(session: ScheduleSession): { left: string; width: string } {
  const startMin = moscowMinutesSinceMidnight(session.start_at);
  const startMs = new Date(session.start_at).getTime();
  const endMs = sessionEndMs(startMs, session.end_at, 180);
  const endMin = moscowMinutesSinceMidnight(new Date(endMs).toISOString());

  const clampedStart = Math.max(TIMELINE_START_MIN, Math.min(startMin, TIMELINE_END_MIN));
  const clampedEnd = Math.max(TIMELINE_START_MIN, Math.min(endMin, TIMELINE_END_MIN));
  const widthMin = Math.max(clampedEnd - clampedStart, 12);

  return {
    left: `${((clampedStart - TIMELINE_START_MIN) / TIMELINE_SPAN) * 100}%`,
    width: `${(widthMin / TIMELINE_SPAN) * 100}%`,
  };
}

function DayTimeline({ sessions }: { sessions: ScheduleSession[] }) {
  if (sessions.length === 0) return null;

  const hours = [6, 9, 12, 15, 18, 21];

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
        Лента дня (МСК)
      </p>
      <div className="relative mb-1 h-10 rounded-lg bg-white ring-1 ring-gray-200">
        {sessions.map((session) => {
          const style = sessionTimelineStyle(session);
          const color =
            session.schedule_issue === 'overlap'
              ? 'bg-red-500'
              : session.schedule_issue === 'buffer'
                ? 'bg-amber-500'
                : 'bg-emerald-500';

          return (
            <div
              key={session.id}
              className={`absolute top-1 bottom-1 min-w-[4px] rounded-md ${color} opacity-90`}
              style={style}
              title={`${session.tour.title} ${formatTimeRu(session.start_at)}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-semibold text-gray-400">
        {hours.map((h) => (
          <span key={h}>{String(h).padStart(2, '0')}:00</span>
        ))}
      </div>
    </div>
  );
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
  const bufferMinutes = data?.buffer_minutes ?? 60;

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
    for (const [, list] of map) {
      list.sort((a, b) => a.start_at.localeCompare(b.start_at));
    }
    return map;
  }, [data?.sessions]);

  const selectedSessions = sessionsByDay.get(selectedDay) ?? [];
  const selectedMarker = data?.day_markers[selectedDay];
  const issueCount = (data?.sessions ?? []).filter((s) => s.schedule_issue).length;
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
              ? `Календарь месяца · между турами гида минимум ${bufferMinutes} мин`
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
            {issueCount > 0 && (
              <span className="ml-2 font-bold text-amber-700">· проблем: {issueCount}</span>
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
                const hasIssue = marker?.has_overlap || marker?.has_buffer;

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
                    className={`relative flex min-h-[4.25rem] flex-col rounded-xl border-2 p-1.5 text-left transition-all sm:min-h-[4.75rem] ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                        : marker?.has_overlap
                          ? 'border-red-300 bg-red-50/50 hover:border-red-400'
                          : marker?.has_buffer
                            ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400'
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
                      <div className="mt-auto flex flex-col gap-0.5 pt-1">
                        <div className="flex items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              marker?.has_overlap
                                ? 'bg-red-500'
                                : marker?.has_buffer
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={`text-[10px] font-bold leading-none ${
                              marker?.has_overlap
                                ? 'text-red-700'
                                : marker?.has_buffer
                                  ? 'text-amber-800'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {tourCountLabel(marker?.count ?? 0)}
                          </span>
                        </div>
                        {hasIssue && (
                          <span className="text-[9px] font-bold leading-tight text-amber-800">
                            {marker?.has_overlap ? 'пересечение' : 'мало времени'}
                          </span>
                        )}
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
              Норма
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Мало времени между турами
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Пересечение
            </span>
          </div>
        </div>

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
                : selectedMarker?.has_overlap
                  ? `${tourCountLabel(selectedSessions.length)} · есть пересечения`
                  : selectedMarker?.has_buffer
                    ? `${tourCountLabel(selectedSessions.length)} · мало времени между турами`
                    : tourCountLabel(selectedSessions.length)}
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Загрузка…</div>
          ) : selectedSessions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">В этот день туров нет</p>
              <p className="mt-1 text-xs text-gray-400">Выберите день с зелёной или жёлтой меткой</p>
            </div>
          ) : (
            <>
              <DayTimeline sessions={selectedSessions} />

              <ul className="space-y-3">
                {selectedSessions.map((session) => (
                  <li
                    key={session.id}
                    className={`overflow-hidden rounded-2xl border-2 shadow-sm ${
                      session.schedule_issue === 'overlap'
                        ? 'border-red-300 bg-red-50/50'
                        : session.schedule_issue === 'buffer'
                          ? 'border-amber-300 bg-amber-50/40'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex">
                      {session.tour.cover_image ? (
                        <div className="relative w-24 shrink-0 sm:w-28">
                          <img
                            src={session.tour.cover_image}
                            alt=""
                            className="h-full min-h-[6.5rem] w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex w-24 shrink-0 items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 sm:w-28">
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

                        {session.issue_message && (
                          <p
                            className={`mb-2 flex items-start gap-1 text-xs font-bold ${
                              session.schedule_issue === 'overlap'
                                ? 'text-red-700'
                                : 'text-amber-800'
                            }`}
                          >
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {session.issue_message}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {isAdmin && (
                            <Link
                              href={`/admin/tours/${session.tour.id}/edit`}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                            >
                              <MapIcon className="h-3.5 w-3.5" />
                              Сдвинуть время
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
