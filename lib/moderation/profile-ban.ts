export type ProfileBanFields = {
  is_banned?: boolean | null;
  ban_until?: string | null;
  ban_reason?: string | null;
};

/** Активен ли бан (с учётом ban_until в прошлом). */
export function isProfileCurrentlyBanned(
  profile: ProfileBanFields | null | undefined
): boolean {
  if (!profile?.is_banned) return false;
  if (profile.ban_until) {
    const until = new Date(profile.ban_until);
    if (until.getTime() <= Date.now()) return false;
  }
  return true;
}

export const BANNED_RECIPIENT_DM_REASON =
  'Пользователь заблокирован и не может получать сообщения';
