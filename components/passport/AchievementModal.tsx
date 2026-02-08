'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { X, Calendar, MapPin, BookOpen, Award } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';

type AchievementModalProps = {
  isOpen: boolean;
  achievement: {
    id: string;
    badge_type: string;
    badge_name: string;
    badge_description: string | null;
    badge_icon_url: string | null;
    tour_id: string | null;
    diary_id: string | null;
    unlock_date: string;
    verification_data: any;
    tour?: {
      id: string;
      title: string;
      slug: string;
      cover_image?: string | null;
      category?: string | null;
    } | null;
    diary?: {
      id: string;
      title: string;
    } | null;
  } | null;
  achievementStyle: {
    icon: string;
    bg: string;
    border: string;
  };
  onClose: () => void;
};

export default function AchievementModal({
  isOpen,
  achievement,
  achievementStyle,
  onClose,
}: AchievementModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !achievement || !mounted) return null;

  const unlockDate = new Date(achievement.unlock_date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Определяем конкретную причину получения достижения
  const getAchievementReason = () => {
    const badgeType = achievement.badge_type;
    
    // Для достижений по категориям туров
    const categoryReasons: Record<string, string> = {
      history: 'за завершение исторического тура',
      nature: 'за завершение тура по природе',
      culture: 'за завершение культурного тура',
      architecture: 'за завершение архитектурного тура',
      gastronomy: 'за завершение гастрономического тура',
      adventure: 'за завершение приключенческого тура',
    };

    // Для достижений по количеству туров
    if (badgeType === 'first_tour') {
      return 'за завершение первого тура';
    }
    if (badgeType === '10_tours') {
      return 'за завершение 10 туров';
    }
    if (badgeType === '25_tours') {
      return 'за завершение 25 туров';
    }
    if (badgeType === '50_tours') {
      return 'за завершение 50 туров';
    }
    if (badgeType === '100_tours') {
      return 'за завершение 100 туров';
    }

    // Для офлайн достижений, выдаваемых гидами во время туров
    const offlineAchievementReasons: Record<string, string> = {
      offline_participation: 'за активное участие в туре - гид отметил вашу вовлеченность',
      helpful: 'за помощь другим участникам во время тура',
      photographer: 'за отличные фотографии, сделанные во время тура',
      social: 'за создание дружеской атмосферы в группе',
      punctual: 'за пунктуальность - всегда приходили вовремя на все точки маршрута',
      enthusiast: 'за особый интерес к истории и культуре, проявленный во время тура',
      explorer: 'за активное исследование достопримечательностей',
      team_player: 'за отличную работу в команде во время тура',
      curious: 'за интересные вопросы, заданные гиду',
      respectful: 'за уважение к культуре и традициям',
      energetic: 'за высокую активность на протяжении всего тура',
      memory_keeper: 'за ведение заметок и запись интересных фактов',
    };

    // Для офлайн достижений
    if (offlineAchievementReasons[badgeType]) {
      return offlineAchievementReasons[badgeType];
    }

    // Для категорийных достижений
    if (categoryReasons[badgeType]) {
      return categoryReasons[badgeType];
    }

    // Если есть описание, используем его
    if (achievement.badge_description) {
      return achievement.badge_description.toLowerCase();
    }

    return 'за активность в турах';
  };

  const achievementReason = getAchievementReason();

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия в правом верхнем углу */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white bg-red-500 hover:bg-red-600 rounded-full p-2 transition-all duration-200 shadow-md hover:shadow-lg"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Заголовок с градиентом */}
        <div className={`relative bg-gradient-to-br ${achievementStyle.bg} p-8 lg:p-10 border-b-2 ${achievementStyle.border} overflow-hidden`}>
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
          
          <div className="relative z-10">
            {/* Иконка достижения - сверху */}
            <div className="flex justify-center mb-6">
              {achievement.badge_icon_url ? (
                <div className="relative w-36 h-36 lg:w-44 lg:h-44">
                  <Image
                    src={achievement.badge_icon_url}
                    alt={escapeHtml(achievement.badge_name)}
                    fill
                    className="object-contain drop-shadow-2xl"
                  />
                </div>
              ) : (
                <div className={`w-36 h-36 lg:w-44 lg:h-44 bg-white/95 rounded-full flex items-center justify-center text-7xl border-4 border-white shadow-2xl`}>
                  {achievementStyle.icon}
                </div>
              )}
            </div>

            {/* Название и описание */}
            <div className="text-center">
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-3">
                {escapeHtml(achievement.badge_name)}
              </h2>
              {achievement.badge_description && (
                <p className="text-xl text-gray-700 font-semibold">
                  {escapeHtml(achievement.badge_description)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Информация */}
        <div className="p-6 lg:p-8 space-y-5">
          {/* Дата получения */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">Получено</div>
                <div className="text-xl font-black text-gray-900">{unlockDate}</div>
              </div>
            </div>
          </div>

          {/* Причина получения достижения */}
          <div className="bg-gradient-to-br from-emerald-50 rounded-2xl border-2 border-emerald-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2">За что получено</div>
                <div className="text-2xl font-black text-gray-900 leading-tight">
                  Достижение получено {achievementReason}
                </div>
              </div>
            </div>
          </div>

          {/* Связанный тур */}
          {achievement.tour && (
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {achievement.tour.cover_image && (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
                    <Image
                      src={achievement.tour.cover_image}
                      alt={escapeHtml(achievement.tour.title)}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Связанный тур</span>
                  </div>
                  <Link
                    href={`/tours/${achievement.tour.slug}`}
                    className="text-xl font-black text-gray-900 hover:text-blue-600 transition-colors block mb-2"
                  >
                    {escapeHtml(achievement.tour.title)}
                  </Link>
                  {achievement.tour.category && (
                    <div className="mb-2">
                      <span className="inline-block px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                        {achievement.tour.category}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    Этот тур принес вам данное достижение
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Связанный дневник */}
          {achievement.diary && (
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Получено за дневник</div>
                  <Link
                    href={`/diaries/${achievement.diary.id}`}
                    className="text-xl font-black text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {escapeHtml(achievement.diary.title)}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Дополнительная информация из verification_data */}
          {achievement.verification_data && Object.keys(achievement.verification_data).length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">Статистика</div>
                  <div className="space-y-2">
                    {achievement.verification_data.tours_count && (
                      <div className="text-base text-gray-900">
                        <span className="font-semibold">Всего завершено туров: </span>
                        <span className="font-black text-purple-700">{achievement.verification_data.tours_count}</span>
                      </div>
                    )}
                    {achievement.verification_data.category && (
                      <div className="text-base text-gray-900">
                        <span className="font-semibold">Категория тура: </span>
                        <span className="font-black text-purple-700 capitalize">{achievement.verification_data.category}</span>
                      </div>
                    )}
                    {achievement.verification_data.tour_date && (
                      <div className="text-base text-gray-900">
                        <span className="font-semibold">Дата тура: </span>
                        <span className="font-black text-purple-700">
                          {new Date(achievement.verification_data.tour_date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Кнопка закрытия */}
          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-black text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

