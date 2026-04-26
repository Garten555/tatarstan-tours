'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Award, 
  Compass, 
  MapPin, 
  Calendar,
  ExternalLink,
  Star,
  Trophy,
} from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import AchievementCard from './AchievementCard';
import { ExportMapButton } from './ExportMapButton';
import AchievementsRefreshButton from './AchievementsRefreshButton';

interface PublicPassportSectionProps {
  achievements: any[];
  completedTours: any[];
  locations: any[];
  reputationScore: number;
  achievementStyles: Record<string, { icon: string; bg: string; border: string }>;
  isOwner: boolean;
  username?: string | null;
}

export default function PublicPassportSection({
  achievements,
  completedTours,
  locations,
  reputationScore,
  achievementStyles,
  isOwner,
  username,
}: PublicPassportSectionProps) {
  const [activeTab, setActiveTab] = useState<'achievements' | 'tours' | 'locations'>('achievements');

  return (
    <div className="bg-white">
      {/* Табы навигации */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('achievements')}
              className={`relative px-4 py-3 text-center font-semibold text-sm transition-all rounded-t-lg ${
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
              className={`relative px-4 py-3 text-center font-semibold text-sm transition-all rounded-t-lg ${
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
              className={`relative px-4 py-3 text-center font-semibold text-sm transition-all rounded-t-lg ${
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
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
              <div className="flex items-center gap-2">
                {isOwner && <AchievementsRefreshButton />}
                {isOwner && (
                  <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-xs text-emerald-700 font-medium mb-1">Очки опыта</div>
                    <div className="text-xl font-black text-emerald-700">{reputationScore}</div>
                  </div>
                )}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg md:text-xl font-black text-gray-900">
                  Путешествия
                </h2>
                <p className="text-xs text-gray-600">
                  Завершенные туры и поездки
                </p>
              </div>
              {completedTours.length > 0 && (
                <ExportMapButton tours={completedTours} username={username || null} />
              )}
            </div>

            {completedTours.length > 0 ? (
              <div className="space-y-4">
                {completedTours.map((booking: any) => {
                  const tour = booking.tour;
                  if (!tour) return null;
                  
                  return (
                    <div
                      key={booking.id}
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
                    >
                      {tour.cover_image && (
                        <div className="relative h-48 md:h-64 bg-gray-200 overflow-hidden">
                          <Image
                            src={tour.cover_image}
                            alt={escapeHtml(tour.title)}
                            fill
                            className="object-cover"
                            loading="lazy"
                            unoptimized={tour.cover_image?.includes('s3.twcstorage.ru')}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <Link
                              href={`/tours/${tour.slug}`}
                              className="group"
                            >
                              <h3 className="text-xl md:text-2xl font-black text-white mb-2 group-hover:text-emerald-300 transition-colors">
                                {escapeHtml(tour.title)}
                              </h3>
                            </Link>
                          </div>
                        </div>
                      )}
                      <div className="p-4 md:p-6">
                        {!tour.cover_image && (
                          <Link
                            href={`/tours/${tour.slug}`}
                            className="group"
                          >
                            <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 group-hover:text-emerald-600 transition-colors">
                              {escapeHtml(tour.title)}
                            </h3>
                          </Link>
                        )}
                        
                        <div className="space-y-3 mb-4">
                          {tour.city && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                              <span className="font-semibold">{escapeHtml(tour.city.name)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            <span className="font-semibold">
                              {new Date(tour.start_date).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <Link
                            href={`/tours/${tour.slug}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors"
                          >
                            <span>Открыть тур</span>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Compass className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-black mb-2 text-gray-700">Пока нет завершенных туров</p>
                <p className="text-gray-600">Участвуйте в турах, чтобы они появились здесь!</p>
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

