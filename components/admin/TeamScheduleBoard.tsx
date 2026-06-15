'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Map as MapIcon,
  Moon,
  User,
} from 'lucide-react';
import { formatDayMonthYearRu, formatTimeRu } from '@/lib/date/format-ru';
import type { TourAutoScheduleConfig } from '@/lib/tour/auto-schedule-config';
import {
  guideRestKindLabel,
} from '@/lib/tour/guide-rest-display';
import { GUIDE_REST } from '@/lib/tour/rest-day-ui';
import { moscowNowParts } from '@/lib/tour/moscow-wall-clock';
import { currentMoscowDay, moscowDayKey, shiftMoscowMonth } from '@/lib/tour/team-schedule-range';
import { sessionEndMs } from '@/lib/tour/schedule-slot';
import {
  getSessionTimePhase,
  SESSION_TIME_PHASE_LABEL,
  type SessionTimePhase,
} from '@/lib/tour/session-time-phase';
import ShiftSessionTimeModal from '@/components/admin/ShiftSessionTimeModal';

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
  has_ended: boolean;
  has_ongoing: boolean;
  has_upcoming: boolean;
};

type EnrichedScheduleSession = ScheduleSession & { time_phase: SessionTimePhase };

type TimeFilter = 'all' | SessionTimePhase;

type GuideRestEntry = { id: string; name: string; kind: 'fixed' | 'rotation' };

type ScheduleResponse = {
  month: string;
  today: string;
  calendar_cells: CalendarCell[];
  day_markers: Record<string, DayMarker>;
  sessions: ScheduleSession[];
  guides: Array<{ id: string; name: string }>;
  schedule_template: TourAutoScheduleConfig | null;
  rest_by_day: Record<string, GuideRestEntry[]>;
  buffer_minutes: number;
  viewer: { role: string; user_id: string };
};

const FETCH_TIMEOUT_MS = 25_000;

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

function dayMarkerAccent(marker: DayMarker | undefined): 'overlap' | 'buffer' | 'ongoing' | 'upcoming' | 'ended' | 'none' {
  if (!marker || marker.count === 0) return 'none';
  if (marker.has_overlap) return 'overlap';
  if (marker.has_buffer) return 'buffer';
  if (marker.has_ongoing) return 'ongoing';
  if (marker.has_upcoming) return 'upcoming';
  if (marker.has_ended) return 'ended';
  return 'none';
}

function buildScheduleMaps(sessions: EnrichedScheduleSession[]) {
  const sessionsByDay = new Map<string, EnrichedScheduleSession[]>();
  const dayMarkers: Record<string, DayMarker> = {};

  for (const session of sessions) {
    const key = sessionMoscowDayKey(session.start_at);
    const list = sessionsByDay.get(key) ?? [];
    list.push(session);
    sessionsByDay.set(key, list);

    if (!dayMarkers[key]) {
      dayMarkers[key] = {
        count: 0,
        has_overlap: false,
        has_buffer: false,
        has_ended: false,
        has_ongoing: false,
        has_upcoming: false,
      };
    }
    const marker = dayMarkers[key];
    marker.count += 1;
    if (session.schedule_issue === 'overlap') marker.has_overlap = true;
    if (session.schedule_issue === 'buffer') marker.has_buffer = true;
    if (session.time_phase === 'ended') marker.has_ended = true;
    if (session.time_phase === 'ongoing') marker.has_ongoing = true;
    if (session.time_phase === 'upcoming') marker.has_upcoming = true;
  }

  for (const [, list] of sessionsByDay) {
    list.sort((a, b) => a.start_at.localeCompare(b.start_at));
  }

  return { sessionsByDay, dayMarkers };
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

function DayTimeline({ sessions }: { sessions: EnrichedScheduleSession[] }) {
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
                : session.time_phase === 'ended'
                  ? 'bg-slate-400'
                  : session.time_phase === 'ongoing'
                    ? 'bg-blue-500'
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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftSession, setShiftSession] = useState<ScheduleSession | null>(null);
  const fetchGenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const monthCacheRef = useRef<Map<string, ScheduleResponse>>(new Map());

  const isAdmin = viewerRole === 'tour_admin' || viewerRole === 'super_admin';
  const bufferMinutes = data?.buffer_minutes ?? 60;

  const cacheKey = `${viewMonth}:${isAdmin ? guideFilter : 'guide'}`;
  const calendarStale = loading && !data;
  const isRefreshing = loading && Boolean(data);

  const todayKey = useMemo(() => {
    const now = moscowNowParts();
    return moscowDayKey(now.year, now.month, now.day);
  }, []);

  useEffect(() => {
    setData(monthCacheRef.current.get(cacheKey) ?? null);
  }, [cacheKey]);

  const loadSchedule = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const key = `${viewMonth}:${isAdmin ? guideFilter : 'guide'}`;
    setLoading(true);
    setError(null);

    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({ month: viewMonth });
      if (isAdmin && guideFilter !== 'all') {
        params.set('guide_id', guideFilter);
      }
      const res = await fetch(`/api/admin/team-schedule?${params.toString()}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      const json = await res.json();
      if (gen !== fetchGenRef.current) return;
      if (!res.ok) {
        throw new Error(json.error || 'Не удалось загрузить расписание');
      }
      const payload = json as ScheduleResponse;
      monthCacheRef.current.set(key, payload);
      setData(payload);
    } catch (e) {
      if (gen !== fetchGenRef.current) return;
      if (e instanceof DOMException && e.name === 'AbortError') {
        if (timedOut) {
          setError('Превышено время ожидания. Нажмите «Сегодня» или смените месяц.');
        }
        return;
      }
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      window.clearTimeout(timeoutId);
      if (gen === fetchGenRef.current) {
        setLoading(false);
      }
    }
  }, [viewMonth, guideFilter, isAdmin]);

  useEffect(() => {
    void loadSchedule();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadSchedule]);

  const restingByDay = useMemo(() => {
    const map = new Map<string, GuideRestEntry[]>();
    for (const [key, list] of Object.entries(data?.rest_by_day ?? {})) {
      map.set(key, list);
    }
    return map;
  }, [data?.rest_by_day]);

  const enrichedSessions = useMemo((): EnrichedScheduleSession[] => {
    const nowMs = Date.now();
    return (data?.sessions ?? []).map((session) => ({
      ...session,
      time_phase: getSessionTimePhase(session.start_at, session.end_at, nowMs),
    }));
  }, [data?.sessions]);

  const filteredSessions = useMemo(() => {
    if (timeFilter === 'all') return enrichedSessions;
    return enrichedSessions.filter((session) => session.time_phase === timeFilter);
  }, [enrichedSessions, timeFilter]);

  const { sessionsByDay, dayMarkers } = useMemo(
    () => buildScheduleMaps(filteredSessions),
    [filteredSessions]
  );

  const selectedSessions = sessionsByDay.get(selectedDay) ?? [];
  const selectedMarker = dayMarkers[selectedDay];
  const selectedResting =
    isAdmin && guideFilter === 'all'
      ? (restingByDay.get(selectedDay) ?? [])
      : [];
  const selectedGuideRest = useMemo(() => {
    if (!isAdmin || guideFilter === 'all' || guideFilter === 'unassigned') {
      return null;
    }
    return (restingByDay.get(selectedDay) ?? []).find((r) => r.id === guideFilter)?.kind ?? null;
  }, [isAdmin, guideFilter, selectedDay, restingByDay]);
  const issueCount = filteredSessions.filter((s) => s.schedule_issue).length;
  const totalSessions = filteredSessions.length;
  const endedCount = enrichedSessions.filter((s) => s.time_phase === 'ended').length;

  const monthLegend = useMemo(
    () => ({
      upcoming: enrichedSessions.some((s) => s.time_phase === 'upcoming'),
      ongoing: enrichedSessions.some((s) => s.time_phase === 'ongoing'),
      ended: enrichedSessions.some((s) => s.time_phase === 'ended'),
      buffer: enrichedSessions.some((s) => s.schedule_issue === 'buffer'),
      overlap: enrichedSessions.some((s) => s.schedule_issue === 'overlap'),
      rest:
        isAdmin &&
        [...restingByDay.values()].some((list) => list.length > 0),
    }),
    [enrichedSessions, restingByDay, isAdmin]
  );

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
            {timeFilter === 'all' && endedCount > 0 && (
              <span className="ml-2 font-bold text-slate-600">· завершено: {endedCount}</span>
            )}
            {issueCount > 0 && (
              <span className="ml-2 font-bold text-amber-700">· проблем: {issueCount}</span>
            )}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-md">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Статус по времени</span>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-900 focus:border-emerald-400 focus:outline-none"
            >
              <option value="all">Все выезды</option>
              <option value="upcoming">Предстоят</option>
              <option value="ongoing">Идут сейчас</option>
              <option value="ended">Завершены</option>
            </select>
          </label>

          {isAdmin && (
            <label className="flex flex-col gap-1">
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
      </div>

      {error && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadSchedule()}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-900 hover:bg-red-200"
          >
            Повторить
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-lg md:p-5">
          <h2 className="mb-4 flex items-center justify-between gap-2 text-sm font-black uppercase tracking-wide text-gray-700">
            <span>{monthTitle(viewMonth)}</span>
            {isRefreshing && (
              <span className="text-[10px] font-semibold normal-case tracking-normal text-emerald-600">
                Обновление…
              </span>
            )}
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

          {calendarStale ? (
            <div className="py-16 text-center text-sm text-gray-500">Загрузка календаря…</div>
          ) : (
            <div className={`grid grid-cols-7 gap-1 transition-opacity ${isRefreshing ? 'opacity-60' : ''}`}>
              {(data?.calendar_cells ?? []).map((cell) => {
                const marker = dayMarkers[cell.key];
                const isSelected = cell.key === selectedDay;
                const isToday = cell.key === todayKey;
                const hasTours = (marker?.count ?? 0) > 0;
                const hasIssue = marker?.has_overlap || marker?.has_buffer;
                const accent = dayMarkerAccent(marker);
                const isPastDay = cell.key < todayKey;
                const effectiveAccent =
                  isPastDay && hasTours && !marker?.has_ongoing
                    ? 'ended'
                    : accent;
                const resting = restingByDay.get(cell.key) ?? [];
                const guideOnRestDay =
                  isAdmin &&
                  guideFilter !== 'all' &&
                  guideFilter !== 'unassigned' &&
                  !hasTours &&
                  resting.some((r) => r.id === guideFilter);
                const showRestCell =
                  isAdmin &&
                  resting.length > 0 &&
                  (guideOnRestDay || (guideFilter === 'all' && !hasTours));

                const cellClass =
                  isSelected && showRestCell
                    ? GUIDE_REST.calendarCellSelected
                    : isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                      : showRestCell
                        ? GUIDE_REST.calendarCell
                        : effectiveAccent === 'overlap'
                          ? 'border-red-300 bg-red-50/50 hover:border-red-400'
                          : effectiveAccent === 'buffer'
                            ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400'
                            : effectiveAccent === 'ongoing'
                              ? 'border-blue-400 bg-blue-50/50 hover:border-blue-500 ring-1 ring-blue-200/80'
                              : effectiveAccent === 'ended'
                                ? isPastDay
                                  ? 'border-slate-400 bg-slate-200/80 hover:border-slate-500 opacity-90'
                                  : 'border-slate-300 bg-slate-100/70 hover:border-slate-400'
                                : effectiveAccent === 'upcoming'
                                  ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                                  : isPastDay
                                    ? 'border-transparent bg-slate-100/60 hover:border-slate-200'
                                    : 'border-transparent bg-gray-50/80 hover:border-gray-200 hover:bg-white';

                const dotClass =
                  effectiveAccent === 'overlap'
                    ? 'bg-red-500'
                    : effectiveAccent === 'buffer'
                      ? 'bg-amber-500'
                      : effectiveAccent === 'ongoing'
                        ? 'bg-blue-500'
                        : effectiveAccent === 'ended'
                          ? 'bg-slate-600'
                          : effectiveAccent === 'upcoming'
                            ? 'bg-emerald-500'
                            : isPastDay
                              ? 'bg-slate-400'
                              : 'bg-emerald-500';

                const countClass =
                  effectiveAccent === 'overlap'
                    ? 'text-red-700'
                    : effectiveAccent === 'buffer'
                      ? 'text-amber-800'
                      : effectiveAccent === 'ongoing'
                        ? 'text-blue-800'
                        : effectiveAccent === 'ended'
                          ? 'text-slate-800'
                          : effectiveAccent === 'upcoming'
                            ? 'text-emerald-700'
                            : isPastDay
                              ? 'text-slate-600'
                              : 'text-emerald-700';

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
                    className={`relative flex min-h-[4.25rem] flex-col rounded-xl border-2 p-1.5 text-left transition-all sm:min-h-[4.75rem] ${cellClass} ${!cell.in_month ? 'opacity-45' : ''} ${marker?.has_ongoing && effectiveAccent !== 'ongoing' ? 'ring-2 ring-blue-200/70' : ''}`}
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
                          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                          <span className={`text-[10px] font-bold leading-none ${countClass}`}>
                            {tourCountLabel(marker?.count ?? 0)}
                          </span>
                        </div>
                        {hasIssue ? (
                          <span className="text-[9px] font-bold leading-tight text-amber-800">
                            {marker?.has_overlap ? 'пересечение' : 'мало времени'}
                          </span>
                        ) : effectiveAccent === 'ended' && !marker?.has_ongoing && !marker?.has_upcoming ? (
                          <span className="text-[9px] font-bold leading-tight text-slate-700">
                            {isPastDay ? 'прошло' : 'завершено'}
                          </span>
                        ) : null}
                        {marker?.has_ongoing ? (
                          <span className="text-[9px] font-bold leading-tight text-blue-700">
                            идёт сейчас
                          </span>
                        ) : null}
                      </div>
                    )}

                    {showRestCell && (
                      <span className={`mt-auto ${GUIDE_REST.badge}`}>
                        <Moon className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        {guideFilter === 'all' ? `отдых · ${resting.length}` : 'отдых'}
                      </span>
                    )}

                    {hasTours && isAdmin && guideFilter === 'all' && resting.length > 0 && (
                      <span className={`mt-1 ${GUIDE_REST.badge}`}>
                        <Moon className="h-2.5 w-2.5 shrink-0" aria-hidden />
                        отдых · {resting.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-semibold text-gray-500">
            {monthLegend.upcoming && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Предстоит
              </span>
            )}
            {monthLegend.ongoing && (
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Идёт сейчас
              </span>
            )}
            {monthLegend.ended && (
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                Завершён
              </span>
            )}
            {monthLegend.buffer && (
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Мало времени между турами
              </span>
            )}
            {monthLegend.overlap && (
              <span className="flex items-center gap-1.5 text-red-600">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Пересечение
              </span>
            )}
            {monthLegend.rest && (
              <span className={`flex items-center gap-1.5 ${GUIDE_REST.legendText}`}>
                <span className={`h-2 w-2 rounded-full ${GUIDE_REST.legendDot}`} />
                Отдых гида
              </span>
            )}
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
                ? selectedGuideRest
                  ? `Отдых · ${guideRestKindLabel(selectedGuideRest)}`
                  : timeFilter === 'all'
                    ? 'Нет выездов'
                    : 'Нет выездов с выбранным фильтром'
                : selectedMarker?.has_overlap
                  ? `${tourCountLabel(selectedSessions.length)} · есть пересечения`
                  : selectedMarker?.has_buffer
                    ? `${tourCountLabel(selectedSessions.length)} · мало времени между турами`
                    : tourCountLabel(selectedSessions.length)}
            </p>
          </div>

          {isAdmin && selectedResting.length > 0 && (
            <div className={`mb-4 ${GUIDE_REST.panel}`}>
              <p className={`mb-2 ${GUIDE_REST.panelTitle}`}>
                Отдыхают ({selectedResting.length})
              </p>
              <ul className="space-y-1 text-sm text-slate-800">
                {selectedResting.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-xs text-slate-500">{guideRestKindLabel(g.kind)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {calendarStale ? (
            <div className="py-12 text-center text-sm text-gray-500">Загрузка…</div>
          ) : selectedSessions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">
                {selectedGuideRest
                  ? 'У выбранного гида выходной по шаблону'
                  : timeFilter === 'all'
                    ? 'В этот день туров нет'
                    : 'Нет туров с выбранным фильтром'}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {selectedGuideRest
                  ? guideRestKindLabel(selectedGuideRest)
                  : timeFilter === 'all'
                    ? selectedResting.length > 0
                      ? 'Список отдыхающих — выше'
                      : 'Выберите день с меткой или фильтр «Завершены» для прошедших выездов'
                    : 'Попробуйте «Все выезды» или другой статус'}
              </p>
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
                          : session.time_phase === 'ended'
                            ? 'border-slate-300 bg-slate-50/80'
                            : session.time_phase === 'ongoing'
                              ? 'border-blue-200 bg-blue-50/40'
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

                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              session.time_phase === 'ended'
                                ? 'bg-slate-200 text-slate-700'
                                : session.time_phase === 'ongoing'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {SESSION_TIME_PHASE_LABEL[session.time_phase]}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                            {STATUS_LABEL[session.status] ?? session.status}
                          </span>
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
                            <>
                              {session.time_phase !== 'ended' && (
                                <button
                                  type="button"
                                  onClick={() => setShiftSession(session)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  Сдвинуть время
                                </button>
                              )}
                              <Link
                                href={`/admin/tours/${session.tour.id}/edit`}
                                className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100"
                              >
                                <MapIcon className="h-3.5 w-3.5" />
                                Тур
                              </Link>
                            </>
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

      <ShiftSessionTimeModal
        session={shiftSession}
        bufferMinutes={bufferMinutes}
        onClose={() => setShiftSession(null)}
        onSaved={loadSchedule}
      />
    </div>
  );
}
