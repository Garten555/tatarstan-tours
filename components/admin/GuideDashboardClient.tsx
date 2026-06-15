'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  MessageSquare,
  MapPin,
  Clock,
  ArrowRight,
  Loader2,
  DoorOpen,
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';
import {
  roomDepartureEnd,
  roomDepartureStart,
} from '@/lib/achievements/dedupe-award-rooms';
import type {
  GuideDashboardData,
  GuideDashboardRoom,
  GuideDashboardStats,
} from '@/lib/admin/guide-dashboard-data';

const EMPTY_STATS: GuideDashboardStats = {
  totalRooms: 0,
  activeRooms: 0,
  upcomingRooms: 0,
  completedRooms: 0,
  totalParticipants: 0,
  unreadMessages: 0,
};

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-lg bg-white p-4 shadow sm:p-6">
      <div className="h-4 w-24 rounded bg-gray-200" />
      <div className="mt-3 h-8 w-12 rounded bg-gray-200" />
    </div>
  );
}

function RoomSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 md:p-5">
      <div className="flex gap-4">
        <div className="h-24 w-24 shrink-0 rounded-xl bg-gray-200" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-6 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-1/2 rounded bg-gray-100" />
          <div className="h-4 w-1/3 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

function lifecycleLabel(lifecycle: GuideDashboardRoom['lifecycle']) {
  switch (lifecycle) {
    case 'ongoing':
      return { text: 'Идёт сейчас', className: 'bg-emerald-100 text-emerald-800' };
    case 'upcoming':
      return { text: 'Предстоит', className: 'bg-blue-100 text-blue-800' };
    default:
      return { text: 'Завершён', className: 'bg-gray-100 text-gray-800' };
  }
}

export default function GuideDashboardClient() {
  const [stats, setStats] = useState<GuideDashboardStats>(EMPTY_STATS);
  const [previewRooms, setPreviewRooms] = useState<GuideDashboardRoom[]>([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/guide/dashboard', { credentials: 'include' });
      const data = (await res.json()) as GuideDashboardData & {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось загрузить панель');
      }
      setStats(data.stats);
      setPreviewRooms(data.previewRooms);
      setTotalRooms(data.totalRooms);
    } catch (e) {
      setError((e as Error).message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const formatDate = formatDateTimeShortRu;

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">Панель гида</h1>
        <p className="mt-1 text-sm text-gray-600 sm:mt-2 sm:text-base">
          Управление турами и общение с участниками
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 font-semibold underline"
          >
            Повторить
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-lg bg-white p-4 shadow sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">Всего комнат</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                    {stats.totalRooms}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                  <DoorOpen className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">Идёт сейчас</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600 sm:text-3xl">
                    {stats.activeRooms}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                  <Clock className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">Предстоит</p>
                  <p className="mt-1 text-2xl font-bold text-blue-600 sm:text-3xl">
                    {stats.upcomingRooms}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">Завершено</p>
                  <p className="mt-1 text-2xl font-bold text-gray-600 sm:text-3xl">
                    {stats.completedRooms}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  <Calendar className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">Участников</p>
                  <p className="mt-1 text-2xl font-bold text-purple-600 sm:text-3xl">
                    {stats.totalParticipants}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-4 shadow sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 sm:text-base">Непрочитанных</p>
                  <p className="mt-1 text-2xl font-bold text-orange-600 sm:text-3xl">
                    {stats.unreadMessages}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <section id="rooms" className="scroll-mt-6 rounded-lg bg-white p-4 shadow sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Комнаты туров</h2>
            <p className="text-sm text-gray-600">
              Активные и ближайшие выезды — откройте чат с участниками
            </p>
          </div>
          {totalRooms > 0 ? (
            <Link
              href="/admin/my-tours"
              className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              Все комнаты ({totalRooms})
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-4">
            <RoomSkeleton />
            <RoomSkeleton />
            <RoomSkeleton />
          </div>
        ) : previewRooms.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
            <DoorOpen className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-semibold text-gray-800">Пока нет назначенных комнат</p>
            <p className="mt-1 text-sm text-gray-600">
              Администратор назначит вас гидом в разделе «Комнаты туров»
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {previewRooms.map((room) => {
              const badge = lifecycleLabel(room.lifecycle);
              return (
                <div
                  key={room.id}
                  className="rounded-xl border border-gray-200 p-4 transition-shadow hover:shadow-md md:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-28">
                        {room.tour.cover_image ? (
                          <img
                            src={room.tour.cover_image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-xs font-bold text-emerald-700">
                            Тур
                          </div>
                        )}
                        {room.unread_count > 0 ? (
                          <span className="absolute bottom-1 right-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {escapeHtml(room.tour.title)}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                          >
                            {badge.text}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
                            {formatDate(roomDepartureStart(room))}
                            {roomDepartureEnd(room)
                              ? ` — ${formatDate(roomDepartureEnd(room)!)}`
                              : ''}
                          </span>
                          {room.tour.city ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                              {escapeHtml(room.tour.city.name)}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-4 w-4 shrink-0 text-emerald-600" />
                            {room.participants_count} участников
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/tour-rooms/${room.id}`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Открыть комнату
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="rounded-lg bg-white p-4 shadow sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">Быстрые действия</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/admin/my-tours"
            className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50"
          >
            <DoorOpen className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-900">Комнаты туров</p>
              <p className="text-sm text-gray-600">Все комнаты и фильтры</p>
            </div>
          </Link>
          <Link
            href="/admin/award-achievements"
            className="flex items-center gap-3 rounded-lg border-2 border-gray-200 p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50"
          >
            <MessageSquare className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-900">Выдача достижений</p>
              <p className="text-sm text-gray-600">Награды участникам</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
