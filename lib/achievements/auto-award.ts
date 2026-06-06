import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchUserParticipatedTours } from '@/lib/passport/user-tour-stats';
import { publishAchievementEarned } from '@/lib/pusher/user-notification';
import { syncUserReputationFromAchievements } from '@/lib/reputation/experience';

export type AchievementBadge = {
  badge_type: string;
  badge_name: string;
  badge_description: string;
};

export const FIRST_TOUR_BADGE: AchievementBadge = {
  badge_type: 'first_tour',
  badge_name: 'Первый шаг',
  badge_description: 'Участвовал в первом туре',
};

export const FIRST_BLOG_POST_BADGE: AchievementBadge = {
  badge_type: 'first_blog_post',
  badge_name: 'Блогер',
  badge_description: 'Опубликовал первый пост в блоге',
};

const CATEGORY_BADGES: Record<string, AchievementBadge> = {
  history: {
    badge_type: 'history',
    badge_name: 'Историк',
    badge_description: 'Посетил исторический тур',
  },
  nature: {
    badge_type: 'nature',
    badge_name: 'Натуралист',
    badge_description: 'Посетил тур по природе',
  },
  culture: {
    badge_type: 'culture',
    badge_name: 'Культуролог',
    badge_description: 'Посетил культурный тур',
  },
  architecture: {
    badge_type: 'architecture',
    badge_name: 'Архитектор',
    badge_description: 'Посетил архитектурный тур',
  },
  food: {
    badge_type: 'gastronomy',
    badge_name: 'Гастроном',
    badge_description: 'Посетил гастрономический тур',
  },
  gastronomy: {
    badge_type: 'gastronomy',
    badge_name: 'Гастроном',
    badge_description: 'Посетил гастрономический тур',
  },
  adventure: {
    badge_type: 'adventure',
    badge_name: 'Авантюрист',
    badge_description: 'Посетил приключенческий тур',
  },
};

const TOUR_MILESTONE_BADGES: Record<number, AchievementBadge> = {
  10: {
    badge_type: '10_tours',
    badge_name: 'Исследователь',
    badge_description: 'Участвовал в 10 турах',
  },
  25: {
    badge_type: '25_tours',
    badge_name: 'Путешественник',
    badge_description: 'Участвовал в 25 турах',
  },
  50: {
    badge_type: '50_tours',
    badge_name: 'Мастер путешествий',
    badge_description: 'Участвовал в 50 турах',
  },
  100: {
    badge_type: '100_tours',
    badge_name: 'Легенда путешествий',
    badge_description: 'Участвовал в 100 турах',
  },
};

type EnsureAchievementContext = {
  tour_id?: string | null;
  diary_id?: string | null;
  verification_data?: Record<string, unknown> | null;
};

export async function ensureAchievement(
  serviceClient: SupabaseClient,
  userId: string,
  badge: AchievementBadge,
  context: EnsureAchievementContext = {}
): Promise<{ awarded: boolean; achievement?: { id: string; badge_name: string; badge_type: string; badge_description: string | null } }> {
  const { data: existing } = await serviceClient
    .from('achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_type', badge.badge_type)
    .maybeSingle();

  if (existing) {
    return { awarded: false };
  }

  const { data: inserted, error } = await serviceClient
    .from('achievements')
    .insert({
      user_id: userId,
      badge_type: badge.badge_type,
      badge_name: badge.badge_name,
      badge_description: badge.badge_description,
      tour_id: context.tour_id ?? null,
      diary_id: context.diary_id ?? null,
      verification_data: context.verification_data ?? null,
    })
    .select('id, badge_name, badge_type, badge_description')
    .single();

  if (error) {
    if (error.code === '23505') return { awarded: false };
    console.error('ensureAchievement:', error);
    return { awarded: false };
  }

  if (inserted) {
    await publishAchievementEarned(userId, inserted);
  }

  return { awarded: Boolean(inserted), achievement: inserted ?? undefined };
}

/** Категория, первый шаг, вехи — по участию (confirmed/completed + достижения с tour_id). */
export async function syncTourParticipationAchievements(
  serviceClient: SupabaseClient,
  userId: string,
  preferredTourId?: string | null
): Promise<number> {
  let awarded = 0;

  const participated = await fetchUserParticipatedTours(serviceClient, userId);
  if (participated.length === 0) return 0;

  const tourIds = participated.map((row) => row.tour_id);
  const anchorTourId = preferredTourId && tourIds.includes(preferredTourId)
    ? preferredTourId
    : participated[participated.length - 1]?.tour_id ?? tourIds[0];

  const { data: tours } = await serviceClient
    .from('tours')
    .select('id, category')
    .in('id', tourIds);

  const categories = new Set(
    (tours ?? []).map((t) => (t as { category?: string }).category).filter(Boolean) as string[]
  );

  for (const category of categories) {
    const badge = CATEGORY_BADGES[category];
    if (!badge) continue;
    const result = await ensureAchievement(serviceClient, userId, badge, {
      tour_id: anchorTourId,
    });
    if (result.awarded) awarded += 1;
  }

  const firstResult = await ensureAchievement(serviceClient, userId, FIRST_TOUR_BADGE, {
    tour_id: anchorTourId,
  });
  if (firstResult.awarded) awarded += 1;

  const count = participated.length;
  for (const milestone of [10, 25, 50, 100]) {
    if (count < milestone) continue;
    const badge = TOUR_MILESTONE_BADGES[milestone];
    const result = await ensureAchievement(serviceClient, userId, badge, {
      tour_id: anchorTourId,
      verification_data: { tours_count: count },
    });
    if (result.awarded) awarded += 1;
  }

  if (awarded > 0) {
    await syncUserReputationFromAchievements(serviceClient, userId);
  }

  return awarded;
}

/** Первый опубликованный пост в блоге. */
export async function syncBlogPostAchievements(
  serviceClient: SupabaseClient,
  userId: string,
  postId?: string | null
): Promise<number> {
  const { count, error } = await serviceClient
    .from('travel_blog_posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'published');

  if (error) {
    console.error('syncBlogPostAchievements:', error);
    return 0;
  }

  if (!count || count < 1) return 0;

  const result = await ensureAchievement(serviceClient, userId, FIRST_BLOG_POST_BADGE, {
    verification_data: postId ? { post_id: postId } : null,
  });

  if (result.awarded) {
    await syncUserReputationFromAchievements(serviceClient, userId);
    return 1;
  }

  return 0;
}

/** Полная синхронизация туров + блога (кнопка «Проверить достижения»). */
export async function syncAllUserAchievements(
  serviceClient: SupabaseClient,
  userId: string
): Promise<{ awarded: number; reputation_score: number; status_level: number }> {
  const tourAwarded = await syncTourParticipationAchievements(serviceClient, userId);
  const blogAwarded = await syncBlogPostAchievements(serviceClient, userId);
  const reputation = await syncUserReputationFromAchievements(serviceClient, userId);

  return {
    awarded: tourAwarded + blogAwarded,
    reputation_score: reputation.reputation_score,
    status_level: reputation.status_level,
  };
}
