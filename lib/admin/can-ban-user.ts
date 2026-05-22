/** Может ли текущий админ заблокировать пользователя с ролью targetRole (в т.ч. гида). */
export function canBanUserAsAdmin(
  viewerRole: string,
  targetUserId: string,
  targetRole: string | null | undefined,
  viewerUserId: string
): boolean {
  if (!targetUserId || targetUserId === viewerUserId) return false;
  if (!['super_admin', 'tour_admin', 'support_admin'].includes(viewerRole)) return false;
  if (targetRole === 'super_admin') return false;
  if (
    viewerRole === 'support_admin' &&
    targetRole &&
    ['tour_admin', 'support_admin'].includes(targetRole)
  ) {
    return false;
  }
  return true;
}
