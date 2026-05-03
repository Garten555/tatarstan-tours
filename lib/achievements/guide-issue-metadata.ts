/** Иконки и категории для модалки выдачи достижений гидом (единые для админки и комнаты тура). */

export interface GuideIssueAchievement {
  badge_type: string;
  badge_name: string;
  badge_description: string;
}

export type AchievementIssueCategoryKey =
  | 'all'
  | 'activity'
  | 'social'
  | 'skills'
  | 'behavior';

export const GUIDE_ACHIEVEMENT_BADGE_ICONS: Record<string, string> = {
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

/** Группы для вкладок фильтра (ключ совпадает с AchievementIssueCategoryKey кроме all). */
export const ACHIEVEMENT_ISSUE_CATEGORY_TABS: {
  key: Exclude<AchievementIssueCategoryKey, 'all'>;
  label: string;
  badgeTypes: string[];
}[] = [
  {
    key: 'activity',
    label: 'Активность',
    badgeTypes: ['offline_participation', 'energetic', 'explorer', 'enthusiast'],
  },
  {
    key: 'social',
    label: 'Социальные',
    badgeTypes: ['social', 'team_player', 'helpful'],
  },
  {
    key: 'skills',
    label: 'Навыки',
    badgeTypes: ['photographer', 'memory_keeper', 'curious'],
  },
  {
    key: 'behavior',
    label: 'Поведение',
    badgeTypes: ['punctual', 'respectful'],
  },
];

export function filterGuideIssuesByCategory<T extends { badge_type: string }>(
  achievements: T[],
  categoryKey: AchievementIssueCategoryKey
): T[] {
  if (categoryKey === 'all') return achievements;
  const tab = ACHIEVEMENT_ISSUE_CATEGORY_TABS.find((t) => t.key === categoryKey);
  if (!tab) return achievements;
  return achievements.filter((a) => tab.badgeTypes.includes(a.badge_type));
}
