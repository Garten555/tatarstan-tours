import { GUIDE_ACHIEVEMENT_BADGE_ICONS } from '@/lib/achievements/guide-issue-metadata';

/** Эмодзи для типов достижений (уведомления, лента, паспорт). */
export const ACHIEVEMENT_BADGE_ICONS: Record<string, string> = {
  first_tour: '🥇',
  first_blog_post: '✍️',
  history: '🏛️',
  nature: '🌿',
  culture: '🎭',
  architecture: '🏰',
  gastronomy: '🍽️',
  adventure: '⛰️',
  '10_tours': '🔟',
  '25_tours': '🏅',
  '50_tours': '🏆',
  '100_tours': '💎',
  ...GUIDE_ACHIEVEMENT_BADGE_ICONS,
};

export function getAchievementBadgeIcon(badgeType: string | null | undefined): string {
  if (!badgeType) return '🏆';
  return ACHIEVEMENT_BADGE_ICONS[badgeType] ?? '🏆';
}
