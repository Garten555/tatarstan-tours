import type { SupabaseClient } from '@supabase/supabase-js';

import {
  publishAchievementEarned,
  publishUserNotification,
} from '@/lib/pusher/user-notification';

export function buildAchievementNotificationBody(achievement: {
  id: string;
  badge_type: string;
  badge_description?: string | null;
}): string {
  const lines: string[] = [];
  if (achievement.badge_description?.trim()) {
    lines.push(achievement.badge_description.trim());
  }
  lines.push(`badge_type:${achievement.badge_type}`);
  lines.push(`achievement_id:${achievement.id}`);
  return lines.join('\n');
}

/** Pusher + запись в колокольчик при получении достижения. */
export async function notifyAchievementEarned(
  serviceClient: SupabaseClient,
  userId: string,
  achievement: {
    id: string;
    badge_name: string;
    badge_type: string;
    badge_description?: string | null;
  }
): Promise<void> {
  await publishAchievementEarned(userId, achievement);

  const { data: notification, error } = await serviceClient
    .from('notifications')
    .insert({
      user_id: userId,
      title: `Достижение: ${achievement.badge_name}`,
      body: buildAchievementNotificationBody(achievement),
      type: 'achievement',
    })
    .select('id, user_id, title, body, type, created_at')
    .single();

  if (error) {
    console.error('notifyAchievementEarned notification:', error);
    return;
  }

  if (notification) {
    await publishUserNotification(userId, notification);
  }
}
