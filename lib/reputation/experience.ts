import type { SupabaseClient } from '@supabase/supabase-js';

/** Опыт за тип достижения. */
const ACHIEVEMENT_XP: Record<string, number> = {
  first_tour: 100,
  '10_tours': 250,
  '25_tours': 400,
  '50_tours': 600,
  '100_tours': 1000,
  history: 75,
  nature: 75,
  culture: 75,
  architecture: 75,
  gastronomy: 75,
  adventure: 75,
  offline_participation: 50,
  helpful: 50,
  photographer: 50,
  social: 50,
  punctual: 50,
  enthusiast: 50,
  explorer: 50,
  team_player: 50,
  curious: 50,
  respectful: 50,
  energetic: 50,
  memory_keeper: 50,
};

const DEFAULT_ACHIEVEMENT_XP = 50;

export const STATUS_LEVEL_NAMES: Record<number, string> = {
  1: 'Новичок',
  2: 'Исследователь',
  3: 'Знаток региона',
  4: 'Эксперт',
};

export function getAchievementXp(badgeType: string): number {
  return ACHIEVEMENT_XP[badgeType] ?? DEFAULT_ACHIEVEMENT_XP;
}

export function levelFromReputation(score: number): number {
  if (score >= 1500) return 4;
  if (score >= 500) return 3;
  if (score >= 100) return 2;
  return 1;
}

export function totalXpFromBadgeTypes(badgeTypes: string[]): number {
  return badgeTypes.reduce((sum, badgeType) => sum + getAchievementXp(badgeType), 0);
}

/** Пересчитывает reputation_score и status_level по всем достижениям пользователя. */
export async function syncUserReputationFromAchievements(
  serviceClient: SupabaseClient,
  userId: string
): Promise<{ reputation_score: number; status_level: number }> {
  const { data: achievements, error } = await serviceClient
    .from('achievements')
    .select('badge_type')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  const reputation_score = totalXpFromBadgeTypes(
    (achievements ?? []).map((row) => row.badge_type as string)
  );
  const status_level = levelFromReputation(reputation_score);

  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ reputation_score, status_level })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  return { reputation_score, status_level };
}
