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
import {
  formatDayMonthRu,
  formatDayMonthYearRu,
  formatTimeRu,
} from '@/lib/date/format-ru';
import { addMoscowCalendarDays, moscowNowParts } from '@/lib/tour/moscow-wall-clock';
import { currentMoscowWeekStart, moscowDayKey } from '@/lib/tour/team-schedule-range';

type ScheduleSession = {
  id: string;
  start_at: string;
  end_at: string | null;
  status: string;
  guide_id: string | null;
  guide_name: string;
  tour: { id: string; title: string; slug: string };
  room_id: string | null;
  has_conflict: boolean;
};

type ScheduleDay = { key: string; weekday: number };

type ScheduleResponse = {
  week_start: string;
  days: ScheduleDay[];
  sessions: ScheduleSession[];
  guides: Array<{ id: string; name: string }>;
  viewer: { role: string; user_id: string };
};

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

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

function shiftWeekStart(weekStart: string, deltaWeeks: number): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const shifted = addMoscowCalendarDays(y, m, d, deltaWeeks * 7);
  return `${shifted.year}-${String(shifted.month).padStart(2, '0')}-${String(shifted.day).padStart(2, '0')}`;
}

function weekTitle(weekStart: string, days: ScheduleDay[]): string {
  if (days.length === 0) return weekStart;
  const first = days[0].key;
  const last = days[days.length - 1].key;
  const firstLabel = formatDayMonthRu(`${first}T12:00:00.000Z`);
  const lastLabel = formatDayMonthYearRu(`${last}T12:00:00.000Z`);
  return `${firstLabel} — ${lastLabel}`;
}

interface TeamScheduleBoardProps {
  initialWeekStart: string;
  viewerRole: string;
}

export default function TeamScheduleBoard({
  initialWeekStart,
  viewerRole,
}: TeamScheduleBoardProps) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
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
      const params = new URLSearchParams({ week: weekStart });
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
  }, [weekStart, guideFilter, isAdmin]);

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

  const totalSessions = data?.sessions.length ?? 0;
  const conflictCount = (data?.sessions ?? []).filter((s) => s.has_conflict).length;

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
              ? 'Все выезды по неделям — удобно видеть занятость гидов'
              : 'Ваши назначенные выезды по дням недели'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((w) => shiftWeekStart(w, -1))}
            className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700"
            aria-label="Предыдущая неделя"
          >
            <ChevronLeft className="h-4 w-4" />
            Назад
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(currentMoscowWeekStart().key)}
            className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => shiftWeekStart(w, 1))}
            className="inline-flex items-center gap-1 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm hover:border-emerald-300 hover:text-emerald-700"
            aria-label="Следующая неделя"
          >
            Вперёд
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-lg md:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Неделя</p>
          <p className="text-lg font-black text-gray-900">
            {data ? weekTitle(weekStart, data.days) : weekStart}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Выездов: <span className="font-bold text-gray-900">{totalSessions}</span>
            {conflictCount > 0 && (
              <span className="ml-2 font-bold text-red-600">
                · пересечений: {conflictCount}
              </span>
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

      {loading ? (
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center text-gray-500">
          Загрузка расписания…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-7">
          {(data?.days ?? []).map((day) => {
            const daySessions = sessionsByDay.get(day.key) ?? [];
            const isToday = day.key === todayKey;
            const dayLabel = formatDayMonthRu(`${day.key}T12:00:00.000Z`);

            return (
              <div
                key={day.key}
                className={`min-h-[12rem] rounded-2xl border-2 p-3 shadow-sm ${
                  isToday
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-3 border-b border-gray-200/80 pb-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    {WEEKDAY_SHORT[day.weekday]}
                  </p>
                  <p className="text-sm font-black text-gray-900">{dayLabel}</p>
                </div>

                {daySessions.length === 0 ? (
                  <p className="text-xs font-medium text-gray-400">Нет выездов</p>
                ) : (
                  <ul className="space-y-2">
                    {daySessions.map((session) => (
                      <li
                        key={session.id}
                        className={`rounded-xl border p-2.5 text-xs shadow-sm ${
                          session.has_conflict
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-1 font-bold text-gray-900">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          {formatTimeRu(session.start_at)}
                          {session.end_at && (
                            <>
                              <span className="text-gray-400">—</span>
                              {formatTimeRu(session.end_at)}
                            </>
                          )}
                        </div>

                        <p className="mb-1 line-clamp-2 font-semibold leading-snug text-gray-800">
                          {session.tour.title}
                        </p>

                        {isAdmin && (
                          <p className="mb-1 flex items-center gap-1 text-gray-600">
                            <User className="h-3 w-3 shrink-0" />
                            {session.guide_name}
                          </p>
                        )}

                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          {STATUS_LABEL[session.status] ?? session.status}
                        </p>

                        {session.has_conflict && (
                          <p className="mb-2 flex items-center gap-1 text-[11px] font-bold text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            Пересечение по времени
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {isAdmin && (
                            <Link
                              href={`/admin/tours/${session.tour.id}/edit`}
                              className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                            >
                              <MapIcon className="h-3 w-3" />
                              Тур
                            </Link>
                          )}
                          {session.room_id && (
                            <Link
                              href={`/tour-rooms/${session.room_id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50"
                            >
                              <DoorOpen className="h-3 w-3" />
                              Комната
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
