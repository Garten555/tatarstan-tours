'use client';

import { useState, useEffect } from 'react';
import { 
  Award, 
  Users, 
  Calendar, 
  MapPin,
  Loader2,
  X,
  Crown,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { escapeHtml } from '@/lib/utils/sanitize';

interface Room {
  id: string;
  tour_id: string;
  is_active: boolean;
  created_at: string;
  tour: {
    id: string;
    title: string;
    start_date: string;
    end_date: string | null;
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

interface AvailableAchievement {
  badge_type: string;
  badge_name: string;
  badge_description: string;
}

interface AwardAchievementsListProps {
  rooms: Room[];
}

export default function AwardAchievementsList({ rooms }: AwardAchievementsListProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [loadingParticipants, setLoadingParticipants] = useState<Record<string, boolean>>({});
  const [availableAchievements, setAvailableAchievements] = useState<Record<string, AvailableAchievement[]>>({});
  const [selectedParticipant, setSelectedParticipant] = useState<{ roomId: string; userId: string } | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState<string>('all');

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

  const awardAchievement = async (roomId: string, userId: string, achievement: AvailableAchievement) => {
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

  const achievementIcons: Record<string, string> = {
    offline_participation: '⭐',
    helpful: '🤝',
    photographer: '📸',
    social: '😊',
    punctual: '⏰',
    enthusiast: '🔥',
    explorer: '🧭',
    team_player: '👥',
    curious: '❓',
    respectful: '🙏',
    energetic: '⚡',
    memory_keeper: '📝',
  };

  // Категории достижений
  const achievementCategories: Record<string, { name: string; types: string[] }> = {
    activity: {
      name: 'Активность',
      types: ['offline_participation', 'energetic', 'explorer', 'enthusiast'],
    },
    social: {
      name: 'Социальные',
      types: ['social', 'team_player', 'helpful'],
    },
    skills: {
      name: 'Навыки',
      types: ['photographer', 'memory_keeper', 'curious'],
    },
    behavior: {
      name: 'Поведение',
      types: ['punctual', 'respectful'],
    },
  };

  const getAchievementCategory = (badgeType: string): string => {
    for (const [category, data] of Object.entries(achievementCategories)) {
      if (data.types.includes(badgeType)) {
        return category;
      }
    }
    return 'other';
  };

  const getFilteredAchievements = (roomId: string): AvailableAchievement[] => {
    const achievements = availableAchievements[roomId] || [];
    if (achievementFilter === 'all') {
      return achievements;
    }
    const categoryTypes = achievementCategories[achievementFilter]?.types || [];
    return achievements.filter(a => categoryTypes.includes(a.badge_type));
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
      {rooms.map((room) => {
        const isExpanded = expandedRooms.has(room.id);
        const isTourEnded = room.tour.end_date 
          ? new Date(room.tour.end_date) < new Date()
          : false;
        const isTourStarted = new Date(room.tour.start_date) <= new Date();
        const roomParticipants = participants[room.id] || [];
        const achievements = availableAchievements[room.id] || [];

        return (
          <div
            key={room.id}
            className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden"
          >
            {/* Заголовок тура */}
            <button
              onClick={() => toggleRoom(room.id)}
              className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
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
                      <span className="font-bold">{roomParticipants.length} участников</span>
                    </div>
                  </div>
                </div>

                <div className="ml-6 flex items-center gap-3">
                  <Award className={`w-6 h-6 ${isExpanded ? 'text-amber-600' : 'text-gray-400'} transition-colors`} />
                  <span className="text-base font-bold text-gray-700">
                    {isExpanded ? 'Свернуть' : 'Развернуть'}
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

      {/* Модальное окно выдачи достижения */}
      {showAchievementModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
                <Award className="w-7 h-7 text-amber-600" />
                Выдать достижение
              </h3>
              <button
                onClick={() => {
                  setShowAchievementModal(false);
                  setSelectedParticipant(null);
                }}
                className="text-gray-400 hover:text-gray-900 bg-white/90 hover:bg-white rounded-full p-2 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-base text-gray-600 mb-6 font-semibold">
              Выберите достижение для выдачи участнику
            </p>

            {/* Фильтр по категориям */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setAchievementFilter('all')}
                className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all duration-200 ${
                  achievementFilter === 'all'
                    ? 'bg-amber-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                }`}
              >
                Все
              </button>
              {Object.entries(achievementCategories).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setAchievementFilter(key)}
                  className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all duration-200 ${
                    achievementFilter === key
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {availableAchievements[selectedParticipant.roomId]?.length === 0 ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-amber-600" />
                  <p className="text-xl font-bold text-gray-600">Загрузка достижений...</p>
                </div>
              ) : getFilteredAchievements(selectedParticipant.roomId).length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-xl font-black text-gray-900">Нет достижений в выбранной категории</p>
                </div>
              ) : (
                getFilteredAchievements(selectedParticipant.roomId).map((achievement) => (
                  <button
                    key={achievement.badge_type}
                    onClick={() => awardAchievement(
                      selectedParticipant.roomId,
                      selectedParticipant.userId,
                      achievement
                    )}
                    disabled={awarding}
                    className="w-full text-left p-5 border-2 border-gray-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0 shadow-lg">
                        {achievementIcons[achievement.badge_type] || '🏆'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-lg text-gray-900 mb-1">
                          {achievement.badge_name}
                        </div>
                        <div className="text-base text-gray-600 font-semibold">
                          {achievement.badge_description}
                        </div>
                      </div>
                      {awarding && (
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


