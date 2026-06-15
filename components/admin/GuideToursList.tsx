'use client';

import Link from 'next/link';
import {
  MessageSquare,
  Users,
  Calendar,
  MapPin,
  ArrowRight,
  Award,
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';
import {
  roomDepartureEnd,
  roomDepartureStart,
  roomTourLifecycle,
} from '@/lib/achievements/dedupe-award-rooms';
import type { MappedGuideTourRoom } from '@/lib/admin/guide-tour-room-rows';
import { shiftMonthKey } from '@/lib/admin/guide-tour-rooms-filters';
import { useGuideTourRoomsFilters } from '@/hooks/useGuideTourRoomsFilters';
import GuideTourRoomsFiltersBar, {
  GuideTourRoomsPagination,
} from '@/components/admin/GuideTourRoomsFiltersBar';

interface GuideToursListProps {
  rooms: MappedGuideTourRoom[];
}

const ROOMS_PER_PAGE = 6;

export default function GuideToursList({ rooms }: GuideToursListProps) {
  const filters = useGuideTourRoomsFilters(rooms, ROOMS_PER_PAGE);
  const formatDate = formatDateTimeShortRu;

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center shadow-lg">
        <MessageSquare className="mx-auto mb-6 h-20 w-20 text-gray-300" />
        <h2 className="mb-4 text-2xl font-black text-gray-900 md:text-3xl">
          У вас пока нет назначенных туров
        </h2>
        <p className="text-lg font-bold text-gray-700 md:text-xl">
          Администратор может назначить вас гидом для тура в разделе &quot;Комнаты туров&quot;
        </p>
      </div>
    );
  }

  return (
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
        hasListFilters={filters.hasListFilters}
        onResetFilters={filters.resetListFilters}
        filteredCount={filters.filteredRooms.length}
        totalCount={rooms.length}
        page={filters.page}
        totalPages={filters.totalPages}
        showPagination={filters.showPagination}
        countLabel="туров"
      />

      {rooms.length > 0 && filters.filteredRooms.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="mb-4 text-lg font-black text-gray-800">Нет туров по выбранным фильтрам</p>
          <button
            type="button"
            onClick={filters.resetListFilters}
            className="font-bold text-emerald-700 underline hover:text-emerald-800"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : null}

      {filters.paginatedRooms.map((room) => {
        const lifecycle = roomTourLifecycle(room);

        return (
          <div
            key={room.id}
            className="rounded-xl bg-white p-4 shadow-lg transition-shadow hover:shadow-xl md:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="relative h-28 w-full max-w-[200px] shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-32 sm:w-40 md:h-36 md:w-44">
                  {room.tour.cover_image ? (
                    <img
                      src={room.tour.cover_image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-bold text-emerald-700">
                      Тур
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
                      {escapeHtml(room.tour.title)}
                    </h2>
                    {lifecycle === 'ongoing' && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        Идет сейчас
                      </span>
                    )}
                    {lifecycle === 'ended' && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                        Завершен
                      </span>
                    )}
                    {lifecycle === 'upcoming' && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                        Предстоит
                      </span>
                    )}
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="font-semibold text-gray-800">
                        {formatDate(roomDepartureStart(room))}
                      </span>
                      {roomDepartureEnd(room) && (
                        <span> — {formatDate(roomDepartureEnd(room)!)}</span>
                      )}
                      {room.session_start_at ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          Выезд
                        </span>
                      ) : null}
                    </div>
                    {room.tour.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{escapeHtml(room.tour.city.name)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>{room.participants_count} участников</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MessageSquare className="h-4 w-4" />
                      <span>Комната тура</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                      <Award className="h-4 w-4" />
                      <span>Выдача достижений в комнате</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 lg:ml-4 lg:min-w-[200px]">
                <Link
                  href={`/tour-rooms/${room.id}?tab=participants`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-600"
                  title="Выдать достижения участникам"
                >
                  <Award className="h-4 w-4" />
                  <span>Выдать достижения</span>
                </Link>
                <Link
                  href={`/tour-rooms/${room.id}`}
                  className="flex transform items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-black text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl"
                >
                  <span>Открыть комнату</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {filters.filteredRooms.length > 0 && filters.showPagination ? (
        <GuideTourRoomsPagination
          accent="emerald"
          page={filters.page}
          totalPages={filters.totalPages}
          onPageChange={filters.setPage}
        />
      ) : null}
    </div>
  );
}
