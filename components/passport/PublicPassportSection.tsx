'use client';

import { useState } from 'react';
import { 
  Award, 
  Compass, 
  MapPin, 
  Star,
  Trophy,
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import AchievementCard from './AchievementCard';
import { ParticipatedTourCard } from './ParticipatedTourCard';

interface PublicPassportSectionProps {
  achievements: any[];
  completedTours: any[];
  locations: any[];
  reputationScore: number;
  statusLevel: number;
  statusLevelName: string;
  achievementStyles: Record<string, { icon: string; bg: string; border: string }>;
  isOwner: boolean;
  username?: string | null;
}

export default function PublicPassportSection({
  achievements,
  completedTours,
  locations,
  reputationScore,
  statusLevel,
  statusLevelName,
  achievementStyles,
  isOwner,
  username,
}: PublicPassportSectionProps) {
  const [activeTab, setActiveTab] = useState<'achievements' | 'tours' | 'locations'>('achievements');

  return (
    <div className="bg-white">
      {/* Табы навигации */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setActiveTab('achievements')}
              className={`relative shrink-0 px-3 py-2.5 text-center text-xs font-semibold transition-all rounded-t-lg sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === 'achievements'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Award className={`w-4 h-4 ${activeTab === 'achievements' ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span>Достижения</span>
                {achievements.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'achievements'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {achievements.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('tours')}
              className={`relative shrink-0 px-3 py-2.5 text-center text-xs font-semibold transition-all rounded-t-lg sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === 'tours'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Compass className={`w-4 h-4 ${activeTab === 'tours' ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span>Путешествия</span>
                {completedTours.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'tours'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {completedTours.length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`relative shrink-0 px-3 py-2.5 text-center text-xs font-semibold transition-all rounded-t-lg sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === 'locations'
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MapPin className={`w-4 h-4 ${activeTab === 'locations' ? 'text-emerald-600' : 'text-gray-500'}`} />
                <span>Места</span>
                {locations.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'locations'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {locations.length}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Контент табов */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2">
        {/* Достижения */}
        {activeTab === 'achievements' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Достижения
                </h2>
                <p className="text-xs text-gray-600">
                  Награды за участие в турах и активность
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-xs text-emerald-700 font-medium mb-1">Опыт</div>
                  <div className="text-xl font-black text-emerald-700">{reputationScore}</div>
                </div>
                <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium mb-1">Уровень {statusLevel}</div>
                  <div className="text-base font-black text-blue-900">{statusLevelName}</div>
                </div>
              </div>
            </div>

            {achievements.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {achievements.map((achievement: any) => {
                  const style = achievementStyles[achievement.badge_type] || {
                    icon: '🏆',
                    bg: 'from-yellow-50 to-amber-50',
                    border: 'border-yellow-200',
                  };

                  return (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      achievementStyle={style}
                      viewerIsOwner={isOwner}
                      profileUsername={username}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-black mb-2 text-gray-700">Пока нет достижений</p>
                <p className="text-gray-600">Создавайте дневники и участвуйте в турах, чтобы получить бейджи!</p>
              </div>
            )}
          </div>
        )}

        {/* Путешествия */}
        {activeTab === 'tours' && (
          <div className="space-y-3">
            <div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Путешествия
                </h2>
                <p className="text-xs text-gray-600">
                  Туры, в которых вы участвовали
                </p>
              </div>

            {completedTours.length > 0 ? (
              <div className="space-y-6 max-w-3xl mx-auto">
                {completedTours.map((booking: any) => {
                  const tour = booking.tour;
                  if (!tour) return null;

                  return (
                    <ParticipatedTourCard
                      key={booking.id}
                      bookingId={booking.id}
                      tour={tour}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Compass className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-black mb-2 text-gray-700">Пока нет туров</p>
                <p className="text-gray-600">Участвуйте в турах — они появятся здесь после бронирования или достижения</p>
              </div>
            )}
          </div>
        )}

        {/* Места */}
        {activeTab === 'locations' && (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg md:text-xl font-black text-gray-900">
                Посещенные места
              </h2>
              <p className="text-xs text-gray-600">
                Локации из путешествий и дневников
              </p>
            </div>

            {locations.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {locations.map((location: any, index: number) => (
                  <div
                    key={`loc-${index}`}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-emerald-300 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-lg mb-3">
                      <MapPin className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="font-black text-lg text-gray-900 mb-2">
                      {escapeHtml(location.name)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {location.visit_count} {location.visit_count === 1 ? 'раз' : 'раза'}
                    </div>
                    {location.tour_ids && location.tour_ids.length > 0 && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-semibold inline-block">
                        {location.tour_ids.length} {location.tour_ids.length === 1 ? 'тур' : 'туров'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-black mb-2 text-gray-700">Пока нет посещенных мест</p>
                <p className="text-gray-600">Создавайте дневники и участвуйте в турах, чтобы отслеживать свои путешествия!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

