'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/sanitize';
import {
  GUIDE_ACHIEVEMENT_BADGE_ICONS,
  ACHIEVEMENT_ISSUE_CATEGORY_TABS,
  filterGuideIssuesByCategory,
  type AchievementIssueCategoryKey,
  type GuideIssueAchievement,
} from '@/lib/achievements/guide-issue-metadata';

export interface AchievementAwardPickerProps {
  achievements: GuideIssueAchievement[];
  awarding: boolean;
  onSelect: (achievement: GuideIssueAchievement) => void;
  /** Тёмная тема (комната тура, вкладка «Участники»). */
  embedded?: boolean;
  /** Ограничение высоты списка карточек (Tailwind). */
  listMaxHeightClass?: string;
}

export default function AchievementAwardPicker({
  achievements,
  awarding,
  onSelect,
  embedded = false,
  listMaxHeightClass = 'max-h-[min(52vh,420px)]',
}: AchievementAwardPickerProps) {
  const [category, setCategory] = useState<AchievementIssueCategoryKey>('all');
  const filtered = filterGuideIssuesByCategory(achievements, category);

  const tabBase =
    'rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-150 sm:px-4 sm:py-2.5 sm:text-base';

  const tabInactive = embedded
    ? 'border border-white/15 bg-white/[0.06] text-stone-200 hover:border-white/25 hover:bg-white/10'
    : 'border-2 border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200';

  const tabActive = embedded
    ? 'border border-amber-400/40 bg-amber-500/90 text-[#0c1210] shadow-md shadow-amber-900/30'
    : 'border-2 border-amber-400 bg-amber-500 text-white shadow-lg shadow-amber-500/25';

  const cardBase =
    'w-full rounded-2xl text-left transition-[border-color,background-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 sm:p-5 p-4';

  const cardInactive = embedded
    ? 'border border-white/10 bg-white/[0.04] hover:border-amber-400/45 hover:bg-amber-500/12 hover:shadow-lg hover:shadow-black/20'
    : 'border-2 border-gray-200 bg-white hover:border-amber-500 hover:bg-amber-50 hover:shadow-lg';

  const iconWrap = embedded
    ? 'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl text-white shadow-lg shadow-black/25'
    : 'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl text-white shadow-lg';

  return (
    <>
      <p
        className={`mb-4 shrink-0 text-base font-semibold sm:mb-5 ${
          embedded ? 'text-stone-400' : 'text-gray-600'
        }`}
      >
        Выберите достижение для выдачи участнику
      </p>

      <div className="mb-4 flex flex-wrap gap-2 sm:mb-5">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`${tabBase} ${category === 'all' ? tabActive : tabInactive}`}
        >
          Все
        </button>
        {ACHIEVEMENT_ISSUE_CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCategory(tab.key)}
            className={`${tabBase} ${category === tab.key ? tabActive : tabInactive}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch] ${listMaxHeightClass}`}
      >
        {achievements.length === 0 ? (
          <div className={`py-12 text-center text-sm ${embedded ? 'text-stone-500' : 'text-gray-500'}`}>
            <Loader2 className={`mx-auto mb-3 h-10 w-10 animate-spin ${embedded ? 'text-amber-400' : 'text-amber-600'}`} />
            <p>Загрузка достижений...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={`rounded-2xl border py-10 text-center ${embedded ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-base font-bold ${embedded ? 'text-stone-300' : 'text-gray-800'}`}>
              Нет достижений в выбранной категории
            </p>
            <p className={`mt-1 text-sm ${embedded ? 'text-stone-500' : 'text-gray-600'}`}>
              Выберите другую категорию или «Все»
            </p>
          </div>
        ) : (
          filtered.map((achievement) => (
            <button
              key={achievement.badge_type}
              type="button"
              onClick={() => onSelect(achievement)}
              disabled={awarding}
              className={`${cardBase} ${cardInactive}`}
            >
              <div className="flex items-start gap-4">
                <div className={iconWrap}>
                  {GUIDE_ACHIEVEMENT_BADGE_ICONS[achievement.badge_type] ?? '🏆'}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`mb-1 text-lg font-black leading-snug sm:text-xl ${
                      embedded ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {escapeHtml(achievement.badge_name)}
                  </div>
                  <div
                    className={`text-sm leading-relaxed sm:text-base ${
                      embedded ? 'text-stone-400' : 'text-gray-600'
                    }`}
                  >
                    {escapeHtml(achievement.badge_description)}
                  </div>
                </div>
                {awarding && (
                  <Loader2
                    className={`h-6 w-6 shrink-0 animate-spin ${embedded ? 'text-amber-400' : 'text-amber-600'}`}
                  />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}
