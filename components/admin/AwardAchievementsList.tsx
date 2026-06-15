'use client';

import { useState } from 'react';
import {
  Award,
  Users,
  Calendar,
  MapPin,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';
import { formatDateTimeShortRu } from '@/lib/date/format-ru';
import IssueAchievementFormModal from '@/components/achievements/IssueAchievementFormModal';
import type { GuideIssueAchievement } from '@/lib/achievements/guide-issue-metadata';
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
  tour_session_id?: string | null;
  guide_id?: string | null;
  is_active: boolean;
  created_at: string;
  session_start_at?: string | null;
  session_end_at?: string | null;
  participants_count: number;
  tour: {
    id: string;
    title: string;
    start_date: string;
    end_date: string | null;
    cover_image: string | null;
    city?: {
      name: string;
    };
  };
}

interface Participant {
  id: string;
  user_id: string;
  booking_id: string | null;
  joined_at: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
    role?: string | null;
  };
  booking?: {
    id: string;
    num_people: number;
    status: string;
  };
}

interface AwardAchievementsListProps {
  rooms: Room[];
  /** super_admin / tour_admin видят все комнаты */
  adminCanBrowseAllRooms?: boolean;
  viewerUserId?: string;
  viewerRole?: string;
}

function participantRoleLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  const labels: Record<string, string> = {
    super_admin: 'Супер админ',
    tour_admin: 'Админ туров',
    support_admin: 'Модератор',
    guide: 'Гид',
  };
  return labels[role] ?? null;
}

function tourLifecycle(room: Room) {
  return roomTourLifecycle(room);
}

const ROOMS_PER_PAGE = 6;

export default function AwardAchievementsList({
  rooms,
  adminCanBrowseAllRooms = false,
  viewerUserId,
  viewerRole,
}: AwardAchievementsListProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [roomGuideIds, setRoomGuideIds] = useState<Record<string, string | null>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<Record<string, boolean>>({});
  const [availableAchievements, setAvailableAchievements] = useState<Record<string, GuideIssueAchievement[]>>({});
  const [selectedParticipant, setSelectedParticipant] = useState<{ roomId: string; userId: string } | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const filters = useGuideTourRoomsFilters(rooms, ROOMS_PER_PAGE);

  const formatDate = formatDateTimeShortRu;

  const toggleRoom = async (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
      // Загружаем участников и достижения при раскрытии
      if (!participants[roomId]) {
        await loadParticipants(roomId);
        await loadAvailableAchievements(roomId);
      }
    }
    setExpandedRooms(newExpanded);
  };

  const loadParticipants = async (roomId: string) => {
    setLoadingParticipants(prev => ({ ...prev, [roomId]: true }));
    try {
      const response = await fetch(`/api/tour-rooms/${roomId}/participants`);
      const data = await response.json();
      
      if (data.success) {
        setParticipants(prev => ({ ...prev, [roomId]: data.participants || [] }));
        setRoomGuideIds(prev => ({
          ...prev,
          [roomId]: typeof data.guide_id === 'string' ? data.guide_id : null,
        }));
      } else {
        toast.error('Не удалось загрузить участников');
      }
    } catch (error) {
      console.error('Ошибка загрузки участников:', error);
      toast.error('Ошибка загрузки участников');
    } finally {
      setLoadingParticipants(prev => ({ ...prev, [roomId]: false }));
    }
  };

  const loadAvailableAchievements = async (roomId: string) => {
    try {
      const response = await fetch(`/api/tour-rooms/${roomId}/achievements`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableAchievements(prev => ({ ...prev, [roomId]: data.achievements || [] }));
      }
    } catch (error) {
      console.error('Ошибка загрузки достижений:', error);
    }
  };

  const awardAchievement = async (roomId: string, userId: string, achievement: GuideIssueAchievement) => {
    try {
      setAwarding(true);
      const response = await fetch(`/api/tour-rooms/${roomId}/achievements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          badge_type: achievement.badge_type,
          badge_name: achievement.badge_name,
          badge_description: achievement.badge_description,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Достижение "${achievement.badge_name}" выдано!`);
        setShowAchievementModal(false);
        setSelectedParticipant(null);
      } else {
        toast.error(data.error || 'Не удалось выдать достижение');
      }
    } catch (error) {
      console.error('Ошибка выдачи достижения:', error);
      toast.error('Ошибка выдачи достижения');
    } finally {
      setAwarding(false);
    }
  };

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-12 text-center">
        <Award className="w-20 h-20 text-gray-300 mx-auto mb-6" />
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">
          {adminCanBrowseAllRooms ? 'Нет комнат туров' : 'У вас пока нет назначенных туров'}
        </h2>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          {adminCanBrowseAllRooms
            ? 'Создайте комнату тура в разделе «Комнаты туров» или дождитесь бронирований'
            : 'Администратор может назначить вас гидом для тура в разделе "Комнаты туров"'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GuideTourRoomsFiltersBar
        accent="amber"
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
      />

      {filters.paginatedRooms.map((room) => {
        const isExpanded = expandedRooms.has(room.id);
        const lifecycle = tourLifecycle(room);
        const isTourEnded = lifecycle === 'ended';
        const isTourStarted = lifecycle === 'ongoing' || lifecycle === 'ended';
        const roomParticipants = participants[room.id] || [];

        return (
          <div
            key={room.id}
            className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-xl"
          >
            {/* Заголовок тура — весь блок раскрывает список участников */}
            <button
              type="button"
              onClick={() => toggleRoom(room.id)}
              aria-expanded={isExpanded}
              className="w-full cursor-pointer p-4 text-left transition-colors hover:bg-gray-50 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-36">
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
                  </div>
                  <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h2 className="text-xl md:text-2xl font-black text-gray-900">
                      {escapeHtml(room.tour.title)}
                    </h2>
                    {!isTourStarted && (
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-xl text-sm font-bold">
                        Предстоит
                      </span>
                    )}
                    {isTourStarted && !isTourEnded && (
                      <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-xl text-sm font-bold">
                        Идет сейчас
                      </span>
                    )}
                    {isTourEnded && (
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl text-sm font-bold">
                        Завершен
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-base text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold">{formatDate(roomDepartureStart(room))}</span>
                      {roomDepartureEnd(room) && (
                        <span className="text-gray-500"> - {formatDate(roomDepartureEnd(room)!)}</span>
                      )}
                      {room.session_start_at ? (
                        <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          Выезд
                        </span>
                      ) : null}
                    </div>
                    {room.tour.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold">{escapeHtml(room.tour.city.name)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold">{room.participants_count} участников</span>
                    </div>
                  </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end justify-center gap-1 sm:ml-4">
                  <div className="flex items-center gap-2">
                    <Award
                      className={`h-6 w-6 shrink-0 ${isExpanded ? 'text-amber-600' : 'text-gray-400'} transition-colors`}
                      aria-hidden
                    />
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                  </div>
                  <span className="hidden text-xs font-semibold text-gray-500 sm:block sm:text-right">
                    Нажмите, чтобы {isExpanded ? 'свернуть' : 'открыть участников'}
                  </span>
                  <span className="text-base font-bold text-gray-700 sm:hidden">
                    {isExpanded ? 'Свернуть' : 'Участники'}
                  </span>
                </div>
              </div>
            </button>

            {/* Список участников */}
            {isExpanded && (
              <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
                {loadingParticipants[room.id] ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-emerald-600 mx-auto animate-spin" />
                    <p className="text-xl font-bold text-gray-600 mt-4">Загрузка участников...</p>
                  </div>
                ) : roomParticipants.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-black text-gray-900">Пока нет участников</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roomParticipants.map((participant) => {
                      const fullName = participant.user
                        ? (participant.user.first_name && participant.user.last_name
                            ? `${participant.user.first_name} ${participant.user.last_name}`.trim()
                            : participant.user.email || 'Пользователь')
                        : 'Пользователь';

                      const guideId =
                        roomGuideIds[room.id] ?? room.guide_id ?? null;
                      const isRoomGuide = Boolean(
                        guideId && participant.user_id === guideId
                      );
                      const profileRole = participant.user?.role ?? null;
                      const roleLabel = participantRoleLabel(profileRole);
                      const isViewerSelf =
                        Boolean(viewerUserId) && participant.user_id === viewerUserId;
                      const showAdminBadge =
                        profileRole === 'super_admin' ||
                        profileRole === 'tour_admin' ||
                        (isViewerSelf &&
                          (adminCanBrowseAllRooms ||
                            viewerRole === 'super_admin' ||
                            viewerRole === 'tour_admin'));

                      return (
                        <div
                          key={`${room.id}-${participant.user_id}`}
                          className="flex items-center gap-4 p-5 bg-white rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:shadow-lg transition-all duration-200"
                        >
                          {/* Аватар */}
                          <div className="flex-shrink-0">
                            {participant.user?.avatar_url ? (
                              <img
                                src={participant.user.avatar_url}
                                alt={fullName}
                                className="w-14 h-14 rounded-full border-2 border-emerald-200"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-black text-lg border-2 border-emerald-200">
                                {fullName[0]?.toUpperCase() || 'П'}
                              </div>
                            )}
                          </div>

                          {/* Информация */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-lg font-black text-gray-900 truncate">
                                {fullName}
                              </span>
                              {isRoomGuide ? (
                                <span className="shrink-0 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                  Гид
                                </span>
                              ) : null}
                              {showAdminBadge && roleLabel ? (
                                <span className="shrink-0 rounded-lg bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                                  {roleLabel}
                                </span>
                              ) : null}
                              {!showAdminBadge && roleLabel && profileRole === 'guide' && !isRoomGuide ? (
                                <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                  {roleLabel}
                                </span>
                              ) : null}
                            </div>
                            {participant.user?.email && (
                              <div className="text-base text-gray-600 truncate">
                                {participant.user.email}
                              </div>
                            )}
                            {participant.booking && (
                              <div className="text-sm text-gray-500 mt-1 font-semibold">
                                Участников: {participant.booking.num_people}
                              </div>
                            )}
                          </div>

                          {/* Кнопка выдачи достижения */}
                          <button
                            onClick={() => {
                              setSelectedParticipant({ roomId: room.id, userId: participant.user_id });
                              setShowAchievementModal(true);
                            }}
                            className="flex-shrink-0 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-base font-black transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                            title="Выдать достижение"
                          >
                            <Award className="w-5 h-5" />
                            <span>Выдать</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {rooms.length > 0 && filters.filteredRooms.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="mb-4 text-lg font-black text-gray-800">Нет туров по выбранным фильтрам</p>
          <button
            type="button"
            onClick={filters.resetListFilters}
            className="font-bold text-amber-700 underline hover:text-amber-800"
          >
            Сбросить фильтры
          </button>
        </div>
      )}

      {filters.filteredRooms.length > 0 && filters.showPagination ? (
        <GuideTourRoomsPagination
          accent="amber"
          page={filters.page}
          totalPages={filters.totalPages}
          onPageChange={filters.setPage}
        />
      ) : null}

      <IssueAchievementFormModal
        open={showAchievementModal && selectedParticipant != null}
        onClose={() => {
          setShowAchievementModal(false);
          setSelectedParticipant(null);
        }}
        achievements={
          selectedParticipant ? availableAchievements[selectedParticipant.roomId] || [] : []
        }
        awarding={awarding}
        onSelect={(achievement) => {
          if (selectedParticipant) {
            void awardAchievement(selectedParticipant.roomId, selectedParticipant.userId, achievement);
          }
        }}
        embedded={false}
        overlay="standard"
      />
    </div>
  );
}


