// Страница со списком комнат пользователя
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolveAuthUserForUi } from '@/lib/supabase/auth-quick-client';
import { escapeHtml } from '@/lib/utils/sanitize';
import {
  MessageSquare,
  Calendar,
  MapPin,
  Users,
  Crown,
  ArrowRight,
  Loader2,
  DoorOpen,
} from 'lucide-react';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';
import {
  roomDepartureEnd,
  roomDepartureStart,
  roomTourLifecycle,
} from '@/lib/achievements/dedupe-award-rooms';
import { shiftMonthKey } from '@/lib/admin/guide-tour-rooms-filters';
import { useGuideTourRoomsFilters } from '@/hooks/useGuideTourRoomsFilters';
import GuideTourRoomsFiltersBar, {
  GuideTourRoomsPagination,
} from '@/components/admin/GuideTourRoomsFiltersBar';

interface Room {
  id: string;
  tour_id: string;
  guide_id: string | null;
  is_active: boolean;
  created_at: string;
  role: 'participant' | 'guide';
  tour: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    end_date: string | null;
    cover_image: string | null;
    city: {
      name: string;
    } | null;
  } | null;
  guide: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  } | null;
  participants_count: number;
  session_start_at?: string | null;
  session_end_at?: string | null;
}

type MyRoomFilterRow = {
  id: string;
  role: 'participant' | 'guide';
  session_start_at: string | null;
  session_end_at: string | null;
  tour: {
    title: string;
    start_date: string;
    end_date: string | null;
    city?: { name?: string } | null;
  };
};

const ROOMS_PER_PAGE = 6;

export default function MyRoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [unreadByRoom, setUnreadByRoom] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<'all' | 'guide' | 'participant'>('all');

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/user/rooms', {
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms || []);
        setUnreadByRoom(data.unread_by_room || {});
      } else {
        console.error('Ошибка загрузки комнат:', data.error);
        alert(data.error || 'Не удалось загрузить комнаты');
      }
    } catch (error: unknown) {
      console.error('Ошибка загрузки комнат:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Превышено время ожидания. Попробуйте обновить страницу.');
      } else {
        alert('Ошибка загрузки комнат. Проверьте консоль для деталей.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const currentUser = await resolveAuthUserForUi(supabase);
      if (cancelled) return;
      if (!currentUser) {
        setLoading(false);
        router.replace('/auth');
        return;
      }
      await loadRooms();
    })();

    return () => {
      cancelled = true;
    };
  }, [router, loadRooms]);

  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  const filterRows: MyRoomFilterRow[] = useMemo(
    () =>
      rooms.map((room) => ({
        id: room.id,
        role: room.role,
        session_start_at: room.session_start_at ?? null,
        session_end_at: room.session_end_at ?? null,
        tour: {
          title: room.tour?.title ?? 'Комната тура',
          start_date:
            room.session_start_at ||
            room.tour?.start_date ||
            room.created_at,
          end_date: room.session_end_at ?? room.tour?.end_date ?? null,
          city: room.tour?.city ?? null,
        },
      })),
    [rooms]
  );

  const postFilter = useCallback(
    (list: MyRoomFilterRow[]) => {
      if (roleFilter === 'all') return list;
      return list.filter((r) => r.role === roleFilter);
    },
    [roleFilter]
  );

  const filters = useGuideTourRoomsFilters(filterRows, ROOMS_PER_PAGE, { postFilter });

  useEffect(() => {
    filters.setPage(1);
  }, [roleFilter, filters.setPage]);

  const hasRoleFilter = roleFilter !== 'all';
  const resetAllFilters = () => {
    filters.resetListFilters();
    setRoleFilter('all');
  };

  const formatDeparture = formatDateTimeShortRu;

  if (loading) {
    return (
      <div className="min-h-below-header bg-gray-50 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-xl text-gray-600">Загрузка комнат...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="px-3 py-1.5 bg-emerald-100/50 border border-emerald-200/50 rounded-xl">
              <span className="text-sm font-bold text-emerald-700">Комнаты</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 flex items-center gap-3">
              <DoorOpen className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
              Мои комнаты
            </h1>
          </div>

          <p className="text-base md:text-lg text-gray-600 mb-6">
            Управляйте своими турами и общайтесь с участниками
          </p>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
          {rooms.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-black text-gray-900 mb-2">У вас пока нет комнат</h3>
              <p className="text-base text-gray-600 mb-6">
                Комнаты появятся здесь после подтверждения бронирования тура или назначения гидом
              </p>
              <Link
                href="/tours"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Посмотреть туры
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <GuideTourRoomsFiltersBar
                accent="emerald"
                filterSearch={filters.filterSearch}
                onFilterSearchChange={filters.setFilterSearch}
                lifecycleFilter={filters.lifecycleFilter}
                onLifecycleFilterChange={filters.setLifecycleFilter}
                monthInputValue={filters.monthInputValue}
                onMonthChange={filters.applyMonthFilter}
                onMonthShift={(delta) => {
                  const base = filters.monthInputValue || filters.currentMonthKey();
                  filters.applyMonthFilter(shiftMonthKey(base, delta));
                }}
                onTodayClick={filters.applyTodayFilter}
                isTodayActive={filters.dateFilter === filters.currentDateKey()}
                showClearDates={Boolean(filters.monthFilter || filters.dateFilter)}
                onClearDates={filters.clearDateFilters}
                hasListFilters={filters.hasListFilters || hasRoleFilter}
                onResetFilters={resetAllFilters}
                filteredCount={filters.filteredRooms.length}
                totalCount={rooms.length}
                page={filters.page}
                totalPages={filters.totalPages}
                showPagination={filters.showPagination}
                countLabel="комнат"
              />

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Роль:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'all' as const, label: 'Все' },
                      { id: 'guide' as const, label: 'Я гид' },
                      { id: 'participant' as const, label: 'Участник' },
                    ] as const
                  ).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRoleFilter(id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                        roleFilter === id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filters.filteredRooms.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                  <p className="mb-4 text-lg font-black text-gray-800">
                    Нет комнат по выбранным фильтрам
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="font-bold text-emerald-700 underline hover:text-emerald-800"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filters.paginatedRooms.map((filterRow) => {
                      const room = roomsById.get(filterRow.id);
                      if (!room) return null;

                      const lifecycle = roomTourLifecycle(filterRow);
                      const departureStart = roomDepartureStart(filterRow);
                      const departureEnd = roomDepartureEnd(filterRow);
                      const unreadRoomMessages = unreadByRoom[room.id] || 0;

                      return (
                        <Link
                          key={room.id}
                          href={`/tour-rooms/${room.id}`}
                          className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200 hover:border-emerald-400"
                        >
                          {room.tour?.cover_image ? (
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={room.tour.cover_image}
                                alt={room.tour.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              {room.role === 'guide' && (
                                <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                  <Crown className="w-3 h-3" />
                                  Гид
                                </div>
                              )}
                              {unreadRoomMessages > 0 && (
                                <div className="absolute bottom-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  {unreadRoomMessages > 99 ? '99+' : unreadRoomMessages} новых
                                </div>
                              )}
                              {lifecycle === 'ongoing' && (
                                <div className="absolute top-3 left-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  Идёт сейчас
                                </div>
                              )}
                              {lifecycle === 'upcoming' && (
                                <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  Предстоит
                                </div>
                              )}
                              {lifecycle === 'ended' && (
                                <div className="absolute top-3 left-3 bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  Завершён
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                              <MessageSquare className="w-16 h-16 text-white/30" />
                              {room.role === 'guide' && (
                                <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                  <Crown className="w-3 h-3" />
                                  Гид
                                </div>
                              )}
                            </div>
                          )}

                          <div className="p-6">
                            <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                              {room.tour?.title ? escapeHtml(room.tour.title) : 'Комната тура'}
                            </h3>

                            {room.tour && (
                              <div className="space-y-3 mb-4">
                                {room.tour.city && (
                                  <div className="flex items-center gap-2 text-gray-700 text-base">
                                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span className="font-semibold">
                                      {escapeHtml(room.tour.city.name)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-start gap-2 text-gray-700 text-base">
                                  <Calendar className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                  <div className="min-w-0">
                                    <span className="font-semibold block">
                                      {formatDeparture(departureStart)}
                                    </span>
                                    {departureEnd ? (
                                      <span className="text-sm text-gray-500 block mt-0.5">
                                        до {formatDeparture(departureEnd)}
                                      </span>
                                    ) : null}
                                    {room.session_start_at ? (
                                      <span className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                        Выезд
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            )}

                            {room.guide && room.role !== 'guide' && (
                              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                                {room.guide.avatar_url ? (
                                  <img
                                    src={room.guide.avatar_url}
                                    alt={`${room.guide.first_name} ${room.guide.last_name}`}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold">
                                    {room.guide.first_name[0]}
                                    {room.guide.last_name[0]}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {escapeHtml(room.guide.first_name)}{' '}
                                    {escapeHtml(room.guide.last_name)}
                                  </p>
                                  <p className="text-xs text-gray-500">Гид</p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Users className="w-5 h-5 text-emerald-600" />
                                <span className="text-base font-bold">
                                  {room.participants_count}{' '}
                                  {room.participants_count === 1
                                    ? 'участник'
                                    : room.participants_count < 5
                                      ? 'участника'
                                      : 'участников'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-600 group-hover:gap-3 transition-all">
                                <span className="text-base font-black">Открыть</span>
                                <ArrowRight className="w-5 h-5" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {filters.showPagination ? (
                    <GuideTourRoomsPagination
                      accent="emerald"
                      page={filters.page}
                      totalPages={filters.totalPages}
                      onPageChange={filters.setPage}
                    />
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
