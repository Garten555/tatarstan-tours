'use client';

import { useMemo, useState } from 'react';
import { Award, Users, Calendar, MapPin, Loader2, Search, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';
import IssueAchievementFormModal from '@/components/achievements/IssueAchievementFormModal';
import type { GuideIssueAchievement } from '@/lib/achievements/guide-issue-metadata';

interface Room {
  id: string;
  tour_id: string;
  is_active: boolean;
  created_at: string;
  /** Число участников комнаты (с сервера; до раскрытия списка) */
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
  };
  booking?: {
    id: string;
    num_people: number;
    status: string;
  };
}

interface AwardAchievementsListProps {
  rooms: Room[];
}

type TourLifecycle = 'ongoing' | 'upcoming' | 'ended';

function tourLifecycle(room: Room): TourLifecycle {
  const ended = room.tour.end_date ? new Date(room.tour.end_date) < new Date() : false;
  const started = new Date(room.tour.start_date) <= new Date();
  if (ended) return 'ended';
  if (!started) return 'upcoming';
  return 'ongoing';
}

export default function AwardAchievementsList({ rooms }: AwardAchievementsListProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<Record<string, boolean>>({});
  const [availableAchievements, setAvailableAchievements] = useState<Record<string, GuideIssueAchievement[]>>({});
  const [selectedParticipant, setSelectedParticipant] = useState<{ roomId: string; userId: string } | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<'all' | TourLifecycle>('all');

  const filteredRooms = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return rooms.filter((room) => {
      if (lifecycleFilter !== 'all' && tourLifecycle(room) !== lifecycleFilter) return false;
      if (!q) return true;
      const title = room.tour.title.toLowerCase();
      const city = (room.tour.city?.name ?? '').toLowerCase();
      return title.includes(q) || city.includes(q);
    });
  }, [rooms, filterSearch, lifecycleFilter]);

  const hasListFilters =
    Boolean(filterSearch.trim()) || lifecycleFilter !== 'all';

  const resetListFilters = () => {
    setFilterSearch('');
    setLifecycleFilter('all');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
          У вас пока нет назначенных туров
        </h2>
        <p className="text-lg md:text-xl font-bold text-gray-700">
          Администратор может назначить вас гидом для тура в разделе "Комнаты туров"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-gray-900">Фильтры</h2>
          {hasListFilters && (
            <button
              type="button"
              onClick={resetListFilters}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
            >
              Сбросить
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Поиск по названию тура или городу…"
              className="w-full rounded-xl border-2 border-gray-200 py-3 pl-11 pr-4 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
          </label>
          <label className="flex w-full flex-col gap-1 text-sm lg:w-56">
            <span className="font-bold text-gray-700">Статус тура</span>
            <select
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value as 'all' | TourLifecycle)}
              className="rounded-xl border-2 border-gray-200 px-4 py-3 text-base font-semibold outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="all">Все</option>
              <option value="ongoing">Идёт сейчас</option>
              <option value="upcoming">Предстоят</option>
              <option value="ended">Завершены</option>
            </select>
          </label>
        </div>
        {hasListFilters && (
          <p className="mt-3 text-sm font-semibold text-gray-600">
            Показано:{' '}
            <span className="tabular-nums text-gray-900">{filteredRooms.length}</span> из{' '}
            <span className="tabular-nums text-gray-900">{rooms.length}</span>
          </p>
        )}
      </div>

      {filteredRooms.map((room) => {
        const isExpanded = expandedRooms.has(room.id);
        const isTourEnded = room.tour.end_date 
          ? new Date(room.tour.end_date) < new Date()
          : false;
        const isTourStarted = new Date(room.tour.start_date) <= new Date();
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
                    {!isTourStarted && (
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-xl text-sm font-bold">
                        Предстоит
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-base text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold">{formatDate(room.tour.start_date)}</span>
                      {room.tour.end_date && (
                        <span className="text-gray-500"> - {formatDate(room.tour.end_date)}</span>
                      )}
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

                      return (
                        <div
                          key={participant.id}
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
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-black text-gray-900 truncate">
                                {fullName}
                              </span>
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

      {rooms.length > 0 && filteredRooms.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="mb-4 text-lg font-black text-gray-800">Нет туров по выбранным фильтрам</p>
          <button
            type="button"
            onClick={resetListFilters}
            className="font-bold text-emerald-600 underline hover:text-emerald-700"
          >
            Сбросить фильтры
          </button>
        </div>
      )}

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


