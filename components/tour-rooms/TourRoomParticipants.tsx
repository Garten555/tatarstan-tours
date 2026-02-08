'use client';

// Компонент списка участников комнаты тура
import { useState, useEffect } from 'react';
import { TourRoomParticipant } from '@/types';
import { Users, Crown, Award, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface TourRoomParticipantsProps {
  roomId: string;
  guideId: string | null;
}

interface AvailableAchievement {
  badge_type: string;
  badge_name: string;
  badge_description: string;
}

export function TourRoomParticipants({ roomId, guideId }: TourRoomParticipantsProps) {
  const [participants, setParticipants] = useState<TourRoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdminOrGuide, setIsAdminOrGuide] = useState(false);
  const [availableAchievements, setAvailableAchievements] = useState<AvailableAchievement[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    loadParticipants();
    checkUserPermissions();
    loadAvailableAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const checkUserPermissions = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      if (data.success && data.profile) {
        setCurrentUser(data.profile.id);
        setIsAdminOrGuide(
          data.profile.role === 'tour_admin' || 
          data.profile.role === 'super_admin' || 
          data.profile.id === guideId
        );
      }
    } catch (error) {
      console.error('Ошибка проверки прав:', error);
    }
  };

  const loadAvailableAchievements = async () => {
    try {
      const response = await fetch(`/api/tour-rooms/${roomId}/achievements`);
      const data = await response.json();
      if (data.success) {
        setAvailableAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки достижений:', error);
    }
  };

  const awardAchievement = async (userId: string, achievement: AvailableAchievement) => {
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

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tour-rooms/${roomId}/participants`);
      const data = await response.json();
      
      if (data.success) {
        setParticipants(data.participants || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки участников:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 py-8">Загрузка участников...</div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>Пока нет участников</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Участники ({participants.length})
        </h3>
      </div>

      <div className="space-y-3">
        {participants.map((participant) => {
          const isGuide = participant.user_id === guideId;
          const fullName = participant.user
            ? ((participant.user as any)?.first_name && (participant.user as any)?.last_name
                ? `${(participant.user as any).first_name} ${(participant.user as any).last_name}`.trim()
                : participant.user.full_name || 'Пользователь')
            : 'Пользователь';

          return (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* Аватар */}
              <div className="flex-shrink-0">
                {participant.user?.avatar_url ? (
                  <img
                    src={participant.user.avatar_url}
                    alt={fullName}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold">
                    {fullName[0]?.toUpperCase() || 'П'}
                  </div>
                )}
              </div>

              {/* Информация */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 truncate">
                    {fullName}
                  </span>
                  {isGuide && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      <Crown className="w-3 h-3" />
                      <span>Гид</span>
                    </div>
                  )}
                </div>
                {participant.user?.email && (
                  <div className="text-sm text-gray-500 truncate">
                    {participant.user.email}
                  </div>
                )}
                {participant.booking && (
                  <div className="text-xs text-gray-400 mt-1">
                    Участников: {participant.booking.num_people}
                  </div>
                )}
              </div>

              {/* Дата присоединения */}
              <div className="flex-shrink-0 text-xs text-gray-500">
                {new Date(participant.joined_at).toLocaleDateString('ru-RU')}
              </div>

              {/* Кнопка выдачи достижения (только для админа/гида) */}
              {isAdminOrGuide && participant.user_id !== currentUser && (
                <button
                  onClick={() => {
                    setSelectedParticipant(participant.user_id);
                    setShowAchievementModal(true);
                  }}
                  className="flex-shrink-0 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  title="Выдать достижение"
                >
                  <Award className="w-4 h-4" />
                  <span>Достижение</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Модальное окно выдачи достижения */}
      {showAchievementModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                Выдать достижение
              </h3>
              <button
                onClick={() => {
                  setShowAchievementModal(false);
                  setSelectedParticipant(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Выберите достижение для выдачи участнику
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableAchievements.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Загрузка достижений...</p>
                </div>
              ) : (
                availableAchievements.map((achievement) => {
                  // Иконки для разных типов достижений
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

                  return (
                    <button
                      key={achievement.badge_type}
                      onClick={() => awardAchievement(selectedParticipant, achievement)}
                      disabled={awarding}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0">
                          {achievementIcons[achievement.badge_type] || '🏆'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 mb-1">
                            {achievement.badge_name}
                          </div>
                          <div className="text-base text-gray-600">
                            {achievement.badge_description}
                          </div>
                        </div>
                        {awarding && (
                          <Loader2 className="w-5 h-5 animate-spin text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

