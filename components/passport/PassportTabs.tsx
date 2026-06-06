'use client';

import { useState } from 'react';
import { 
  Award, 
  Compass, 
  MapPin, 
  Star,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import AchievementCard from './AchievementCard';
import { ParticipatedTourCard } from './ParticipatedTourCard';

interface PassportTabsProps {
  achievements: any[];
  completedTours: any[];
  locations: any[];
  reputationScore: number;
  statusLevel: number;
  statusLevelName: string;
  achievementStyles: Record<string, { icon: string; bg: string; border: string }>;
  username?: string | null;
}

export default function PassportTabs({
  achievements,
  completedTours,
  locations,
  reputationScore,
  statusLevel,
  statusLevelName,
  achievementStyles,
  username = null,
}: PassportTabsProps) {
  const [activeTab, setActiveTab] = useState<'achievements' | 'tours' | 'locations'>('achievements');

  return (
    <div className="space-y-6">
      {/* Табы навигации */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 scrollbar-thin">
          <button
            onClick={() => setActiveTab('achievements')}
            className={`min-w-[7.5rem] shrink-0 flex-1 px-3 py-3 text-center text-sm font-bold transition-all sm:px-6 sm:py-4 ${
              activeTab === 'achievements'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Award className="w-5 h-5" />
              <span>Достижения</span>
              {achievements.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {achievements.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('tours')}
            className={`min-w-[7.5rem] shrink-0 flex-1 px-3 py-3 text-center text-sm font-bold transition-all border-x border-gray-200 sm:px-6 sm:py-4 ${
              activeTab === 'tours'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Compass className="w-5 h-5" />
              <span>Путешествия</span>
              {completedTours.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {completedTours.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`min-w-[7.5rem] shrink-0 flex-1 px-3 py-3 text-center text-sm font-bold transition-all sm:px-6 sm:py-4 ${
              activeTab === 'locations'
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>Места</span>
              {locations.length > 0 && (
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-black">
                  {locations.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Контент табов */}
        <div className="p-4 sm:p-6">
          {/* Достижения */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              {/* Заголовок и действия */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                    Мои достижения
                  </h2>
                  <p className="text-gray-600">
                    Награды за участие в турах и активность
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
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
            <div className="space-y-6">
              <div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                    Мои путешествия
                  </h2>
                  <p className="text-gray-600">
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
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
                  Посещенные места
                </h2>
                <p className="text-gray-600">
                  Локации из ваших путешествий и дневников
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
    </div>
  );
}

