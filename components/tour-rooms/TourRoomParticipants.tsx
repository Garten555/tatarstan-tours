'use client';

// Компонент списка участников комнаты тура
import { useState, useEffect, useMemo } from 'react';
import { TourRoomParticipant } from '@/types';
import type { Profile } from '@/types';
import { Users, Crown, Award, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import IssueAchievementFormModal from '@/components/achievements/IssueAchievementFormModal';
import type { GuideIssueAchievement } from '@/lib/achievements/guide-issue-metadata';

interface TourRoomParticipantsProps {
  roomId: string;
  guideId: string | null;
  variant?: 'default' | 'embedded';
}

function getParticipantDisplayName(participant: TourRoomParticipant): string {
  const u = participant.user;
  if (!u) return 'Пользователь';
  const any = u as Profile & { first_name?: string; last_name?: string };
  if (any.first_name && any.last_name) return `${any.first_name} ${any.last_name}`.trim();
  return u.full_name || u.display_name || u.username || u.email || 'Пользователь';
}

function participantHaystack(participant: TourRoomParticipant): string {
  const u = participant.user;
  const bits = [
    getParticipantDisplayName(participant),
    u?.email,
    u?.username,
    u?.display_name,
    u?.full_name,
    u?.phone,
  ].filter(Boolean);
  return bits.join(' ').toLowerCase();
}

export function TourRoomParticipants({ roomId, guideId, variant = 'default' }: TourRoomParticipantsProps) {
  const embedded = variant === 'embedded';
  const [participants, setParticipants] = useState<TourRoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdminOrGuide, setIsAdminOrGuide] = useState(false);
  const [availableAchievements, setAvailableAchievements] = useState<GuideIssueAchievement[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guide' | 'travelers'>('all');

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return participants.filter((p) => {
      if (roleFilter === 'guide' && !(guideId && p.user_id === guideId)) return false;
      if (roleFilter === 'travelers' && guideId && p.user_id === guideId) return false;
      if (!q) return true;
      return participantHaystack(p).includes(q);
    });
  }, [participants, searchQuery, roleFilter, guideId]);

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

  const awardAchievement = async (userId: string, achievement: GuideIssueAchievement) => {
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
      <div className={`py-12 text-center text-sm ${embedded ? 'text-stone-500' : 'text-gray-500'}`}>
        Загрузка участников...
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div
        className={`rounded-2xl border py-14 text-center ${
          embedded ? 'border-white/10 bg-white/[0.03] text-stone-400' : 'text-gray-500'
        }`}
      >
        <Users className={`mx-auto mb-3 h-12 w-12 ${embedded ? 'text-stone-600' : 'text-gray-400'}`} />
        <p>Пока нет участников</p>
      </div>
    );
  }

  const pillInactive = embedded
    ? 'bg-white/[0.06] text-stone-300 ring-1 ring-white/10 hover:bg-white/10'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  const pillActive = embedded
    ? 'bg-emerald-600 text-white ring-1 ring-emerald-400/40 shadow-md'
    : 'bg-emerald-600 text-white';

  return (
    <div className={embedded ? 'text-stone-100' : ''}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${embedded ? 'text-emerald-400/90' : 'text-emerald-600'}`}>
            Состав группы
          </p>
          <h3 className={`mt-1 text-xl font-bold tracking-tight ${embedded ? 'text-white' : 'text-gray-900'}`}>
            Участники
            <span className={`ml-2 text-base font-semibold tabular-nums ${embedded ? 'text-stone-400' : 'text-gray-500'}`}>
              ({participants.length}
              {filteredParticipants.length !== participants.length ? ` · показано ${filteredParticipants.length}` : ''})
            </span>
          </h3>
        </div>
      </div>

      <div className={`mb-4 space-y-3 ${embedded ? '' : ''}`}>
        <div className="relative">
          <Search
            className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${embedded ? 'text-stone-500' : 'text-gray-400'}`}
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, email, логину…"
            autoComplete="off"
            className={`w-full rounded-xl border-2 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 ${
              embedded
                ? 'border-white/10 bg-white/[0.06] text-white placeholder:text-stone-500'
                : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
            }`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all' as const, label: 'Все' },
              { id: 'guide' as const, label: 'Гид' },
              { id: 'travelers' as const, label: 'Участники' },
            ]
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setRoleFilter(id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${roleFilter === id ? pillActive : pillInactive}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredParticipants.length === 0 ? (
        <div
          className={`rounded-2xl border py-12 text-center text-sm ${
            embedded ? 'border-white/10 bg-white/[0.03] text-stone-400' : 'border-gray-200 text-gray-600'
          }`}
        >
          <p className="font-medium">Никого не найдено</p>
          <p className={`mt-1 text-xs ${embedded ? 'text-stone-500' : 'text-gray-500'}`}>
            Попробуйте другой запрос или вкладку фильтра
          </p>
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
        {filteredParticipants.map((participant) => {
          const isGuide = participant.user_id === guideId;
          const fullName = getParticipantDisplayName(participant);

          return (
            <div
              key={participant.id}
              className={`flex items-center gap-3 rounded-2xl p-4 transition ${
                embedded
                  ? isGuide
                    ? 'border border-amber-500/35 bg-gradient-to-br from-amber-500/10 to-transparent ring-1 ring-amber-400/20 hover:border-amber-400/50'
                    : 'border border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                  : 'rounded-lg bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {/* Аватар */}
              <div className="flex-shrink-0">
                {participant.user?.avatar_url ? (
                  <img
                    src={participant.user.avatar_url}
                    alt={fullName}
                    className={`h-12 w-12 rounded-full object-cover ${embedded ? 'ring-2 ring-white/10' : ''}`}
                  />
                ) : (
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-semibold text-white ${
                      embedded ? 'ring-2 ring-emerald-400/30' : ''
                    }`}
                  >
                    {fullName[0]?.toUpperCase() || 'П'}
                  </div>
                )}
              </div>

              {/* Информация */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`truncate font-semibold ${embedded ? 'text-white' : 'text-gray-900'}`}>
                    {fullName}
                  </span>
                  {isGuide && (
                    <div
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        embedded
                          ? 'bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/35'
                          : 'bg-yellow-100 font-medium text-yellow-800'
                      }`}
                    >
                      <Crown className="h-3 w-3" />
                      <span>Гид</span>
                    </div>
                  )}
                </div>
                {participant.user?.email && (
                  <div className={`truncate text-sm ${embedded ? 'text-stone-500' : 'text-gray-500'}`}>
                    {participant.user.email}
                  </div>
                )}
                {participant.booking && (
                  <div className={`mt-1 text-xs ${embedded ? 'text-stone-600' : 'text-gray-400'}`}>
                    Участников: {participant.booking.num_people}
                  </div>
                )}
              </div>

              <div className={`flex-shrink-0 text-xs ${embedded ? 'text-stone-500' : 'text-gray-500'}`}>
                {new Date(participant.joined_at).toLocaleDateString('ru-RU')}
              </div>

              {isAdminOrGuide && participant.user_id !== currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedParticipant(participant.user_id);
                    setShowAchievementModal(true);
                  }}
                  className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    embedded
                      ? 'bg-amber-500/90 text-[#0c1210] hover:bg-amber-400'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                  title="Выдать достижение"
                >
                  <Award className="h-4 w-4" />
                  <span className="hidden sm:inline">Награда</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
      )}

      <IssueAchievementFormModal
        open={showAchievementModal && selectedParticipant != null}
        onClose={() => {
          setShowAchievementModal(false);
          setSelectedParticipant(null);
        }}
        achievements={availableAchievements}
        awarding={awarding}
        onSelect={(achievement) => {
          if (selectedParticipant) void awardAchievement(selectedParticipant, achievement);
        }}
        embedded={embedded}
        overlay="tourRoomOverlay"
      />
    </div>
  );
}

